// All construction coordinates refer to the same locked 1672 × 941 camera.
export const phases = [
  { name: 'foundation', start: 0, change: 1.25 },
  { name: 'deck', start: 1.66, change: 1.8 },
  { name: 'bare', start: 2.02, change: 2.95 },
  { name: 'walls', start: 3.49, change: 3.91 },
  { name: 'frame', start: 4.73, change: 6.18 },
  { name: 'envelope', start: 7.04, change: 7.48 },
  { name: 'cladding', start: 8.31, change: 8.98 },
  { name: 'complete', start: 9.57, change: 10 }
];

export function sampleTimeline(progress) {
  const time = 10 * Math.min(1, Math.max(0, progress));
  const current = phases.findLastIndex(phase => time >= phase.start);
  const next = Math.min(current + 1, phases.length - 1);
  const fraction = next === current ? 0 : Math.max(0,
    (time - phases[current].change) / (phases[next].start - phases[current].change));
  return { time, current, next, fraction };
}

function eased(start, end, time) {
  const t = Math.min(1, Math.max(0, (time - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function groundOpening(time) {
  return {
    unroll: eased(0, .61, time),
    paper: 1 - eased(.69, 1.03, time),
    height: 36 * eased(.65, 1.02, time),
    detail: 1 - eased(.74, 1.05, time),
    ink: 1 - eased(.87, 1.2, time),
    photo: eased(.87, 1.25, time)
  };
}

export function roofPose(time) {
  const approach = eased(4.5, 5.36, time);
  const seating = eased(5.34, 5.57, time);
  const release = eased(5.84, 6.18, time);
  return {
    x: 3 * Math.sin(approach * Math.PI * 2) * (1 - approach),
    y: -83 + 109 * approach + 5 * seating,
    retract: 58 * release,
    slingWidth: 1 - .68 * release,
    contact: seating
  };
}

function movement({ current, next, fraction, time }) {
  const lift = eased(1.89, 2.94, time);
  return {
    roof: roofPose(time),
    wallProjection: [.16 * (1 - lift), .72 + .305 * lift, .28 + .12 * lift, .18 + .035 * lift],
    wallOpacity: current === 2 ? 1 - eased(.74, .88, fraction)
      : next === 2 ? eased(.46, .68, fraction) : 0,
    tackleOpacity: current === 4 ? 1 - eased(.128, .232, fraction)
      : next === 4 ? eased(.60, .76, fraction) : 0
  };
}

// A timing matte stores the changeover time in red and the blend width in green.
// Its paths follow the photographed elevations. Both renderers use the same matte.
const outlines = {
  platform: 'M264 644 L466 582 674 588 731 574 824 584 847 571 1467 595 1465 633 1544 649 1542 704 1321 810 1146 790 1102 812 505 762 505 716 267 691 Z',
  pump: 'M1032 750 L1052 646 1084 485 1104 437 1210 268 Q1227 242 1257 253 L1418 287 1503 424 1508 448 1622 452 1655 516 1656 590 1517 611 1302 575 1310 490 1457 481 1458 434 1392 315 1241 278 1110 485 1066 656 1049 751 Z',
  crane: 'M1230 63 L1229 41 1248 19 1270 24 1468 301 1498 342 1647 550 1654 581 1672 603 1672 779 1442 779 1445 741 1508 692 1521 611 1540 569 1554 569 1440 348 1255 52 1248 64 Z',
  groundFloor: 'M302 528 L548 502 697 510 1017 491 1530 505 1533 684 1304 799 593 764 301 706 Z',
  garageRoof: 'M290 540 L445 386 718 386 706 440 626 562 589 568 Z',
  garageFace: 'M309 533 L605 550 604 725 318 699 Z',
  upperFace: 'M697 413 L1166 417 1155 549 701 536 Z',
  mainRoof: 'M662 422 L806 293 1305 281 1335 291 1175 432 Z',
  gable: 'M1169 424 L1331 288 1467 396 1453 474 1549 528 1549 553 1427 556 1321 490 Z',
  porchRoof: 'M586 576 L697 529 1141 541 1274 463 1397 464 1464 575 1307 613 1143 615 Z',
  frontFace: 'M589 575 L1149 602 1300 598 1309 782 1141 805 605 754 Z',
  sideFace: 'M1300 602 L1429 521 1533 541 1527 707 1304 786 Z',
  garageDoor: 'M367 565 L507 570 509 699 366 692 Z',
  solar: 'M717 393 L814 290 1247 284 1111 406 Z'
};

function makeTimingMatte(stage) {
  const canvas = document.createElement('canvas');
  canvas.width = 836;
  canvas.height = 471;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.scale(canvas.width / 1672, canvas.height / 941);
  const colour = (at, width = .055) =>
    'rgb(' + Math.round(255 * at) + ',' + Math.round(255 * width) + ',0)';
  function sweep(x1, y1, x2, y2, start, end, width = .045) {
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, colour(start, width));
    gradient.addColorStop(1, colour(end, width));
    return gradient;
  }
  function surface(outline, fill) {
    ctx.fillStyle = fill;
    ctx.fill(new Path2D(outlines[outline] ?? outline));
  }
  function subject(x, y, rx, ry, at) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const softEdge = ctx.createRadialGradient(0, 0, .78, 0, 0, 1);
    softEdge.addColorStop(0, colour(at, .027));
    softEdge.addColorStop(1, 'transparent');
    ctx.fillStyle = softEdge;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  ctx.fillStyle = stage === 6 ? sweep(310, 790, 1570, 850, .65, .92) : colour(.53, .11);
  ctx.fillRect(0, 0, 1672, 941);
  if (stage === -1) {
    // A single soft sweep lets the new soil, cast shadows and crew arrive together.
    // Hard subject masks here would leave patches of the empty ground around their boots.
    ctx.fillStyle = sweep(866, 550, 862, 813, .38, .64, .21);
    ctx.fillRect(0, 0, 1672, 941);
  } else if (stage === 0) {
    surface('platform', sweep(825, 580, 815, 770, .32, .81));
    surface('pump', colour(.18, .04));
    for (const [x, y] of [[682, 671], [841, 681], [1027, 695]]) subject(x, y, 76, 91, .18);
    subject(741, 656, 72, 65, .71);
    subject(1262, 678, 83, 76, .77);
  } else if (stage === 1) {
    // The flat and raised walls share the sill. Cut on the carpenters' grip.
    ctx.fillStyle = colour(.43, .045);
    ctx.fillRect(0, 0, 1672, 941);
  } else if (stage === 2 || stage === 3) {
    surface('groundFloor', sweep(338, 623, 1500, 625, .23, .68));
    if (stage === 3) {
      surface('upperFace', sweep(700, 487, 1175, 487, .28, .54));
      surface('garageRoof', sweep(322, 512, 671, 512, .25, .53));
      surface('mainRoof', sweep(720, 368, 1310, 366, .48, .86));
      surface('crane', colour(.27, .048));
    }
  } else {
    // Decking and shingles advance from the eave to the ridge on each slope.
    surface('garageFace', sweep(460, 697, 460, 547, .27, .47));
    surface('frontFace', sweep(895, 775, 902, 598, .31, .56));
    surface('sideFace', sweep(1410, 766, 1400, 581, .47, .69));
    surface('upperFace', sweep(925, 540, 918, 422, .44, .65));
    surface('garageRoof', sweep(448, 542, 442, 386, .18, .42));
    surface('gable', sweep(1390, 503, 1328, 299, .40, .64));
    surface('mainRoof', sweep(956, 419, 952, 289, .39, .73));
    surface('porchRoof', sweep(979, 601, 981, 528, .61, .80));
    surface('garageDoor', sweep(433, 690, 434, 570, .40, .56, .028));
    if (stage === 4) {
      surface('crane', colour(.18, .052));
      subject(1192, 456, 61, 90, .46);
      subject(1330, 465, 43, 79, .48);
    }
    if (stage === 5 || stage === 6) {
      surface('solar', sweep(777, 351, 1180, 345, .51, .76, .035));
      // Windows, including the trim, resolve as complete units within their wall.
      for (const [x, w] of [[747, 104], [879, 67], [974, 119]]) {
        ctx.fillStyle = colour(.58, .048);
        ctx.fillRect(x, 435, w, 97);
      }
    }
    if (stage === 4 || stage === 5) {
      subject(1061, 369, 91, 49, .66);
      subject(739, 661, 55, 70, .52);
      subject(1367, 680, 48, 79, .56);
    }
    if (stage === 5 || stage === 6) {
      subject(964, 550, 82, 56, .67);
      subject(1371, 702, 57, 94, .55);
      subject(400, 652, 42, 65, .44);
    }
  }
  return canvas;
}

const timingMattes = new Map();
function matteFor(stage) {
  if (!timingMattes.has(stage)) timingMattes.set(stage, makeTimingMatte(stage));
  return timingMattes.get(stage);
}

// The two carpenters stand in front of the installed truss. Trace their gloves
// and helmets from the registered frame plate so the timber passes behind them.
const receiverLayers = new WeakMap();
function receivers(photo) {
  if (receiverLayers.has(photo)) return receiverLayers.get(photo);
  const layer = document.createElement('canvas');
  layer.width = 190;
  layer.height = 75;
  const ctx = layer.getContext('2d');
  ctx.translate(-1163, -381);
  const crew = new Path2D(
    'M1167 391 Q1166 385 1169 386 L1173 389 1173 394 Q1175 405 1182 410 L1190 414 1192 411 ' +
    'L1191 405 1188 403 Q1192 394 1198 396 Q1208 395 1210 406 L1209 411 1204 412 1207 416 ' +
    'L1212 424 1212 449 1185 449 1180 421 Q1172 413 1169 403 Z ' +
    'M1313 410 L1311 407 1313 404 1316 406 1317 403 1320 405 1320 409 1317 412 ' +
    'L1320 421 1324 425 1323 416 1321 412 1324 411 1327 416 1329 422 1332 424 ' +
    'L1334 420 1332 419 Q1338 410 1344 417 L1347 421 1346 425 1342 426 1344 431 ' +
    'L1346 451 1319 451 1317 431 Z');
  ctx.clip(crew);
  ctx.drawImage(photo, 0, 0, 1672, 941);
  receiverLayers.set(photo, layer);
  return layer;
}

const vertexSource = `
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = vec2(position.x * .5 + .5, .5 - position.y * .5);
    gl_Position = vec4(position, 0., 1.);
  }
`;

const fragmentSource = `
  precision highp float;
  varying vec2 uv;
  uniform sampler2D currentPhoto, nextPhoto, rig, wall, timing, crew;
  uniform float stage, nextStage, fraction, time, contact, wallOpacity, tackleOpacity, opening;
  uniform vec4 roof, wallProjection;
  const vec2 size = vec2(1672., 941.);

  vec4 over(vec4 foreground, vec4 background) {
    return foreground + background * (1. - foreground.a);
  }
  float falloff(vec2 pixel, vec2 centre, vec2 radius) {
    vec2 delta = (pixel - centre) / radius;
    return 1. - smoothstep(.08, 1., dot(delta, delta));
  }
  // Short strokes centred on shoulders, hands and tools. Boot positions are outside each envelope.
  vec2 workOffset(vec2 p, float s) {
    vec2 offset = vec2(0.);
    if (s < .5) {
      float pull = sin(time * 6.1);
      offset += vec2(4., 1.7) * pull * falloff(p, vec2(694., 681.), vec2(50., 38.));
      offset += vec2(5., 2.) * pull * falloff(p, vec2(838., 680.), vec2(49., 39.));
      offset += vec2(4., .8) * sin(time * 4.3) * falloff(p, vec2(1042., 660.), vec2(42., 72.));
    } else if (s < 1.5) {
      offset += vec2(1.5, 2.3) * sin(time * 12.) * falloff(p, vec2(762., 677.), vec2(38., 33.));
      offset += vec2(1., 2.) * sin(time * 10.) * falloff(p, vec2(1223., 689.), vec2(35., 33.));
    } else if (s > 2.5 && s < 3.5) {
      offset += vec2(2.4, -2.) * sin(time * 11.) * falloff(p, vec2(689., 550.), vec2(37., 39.));
      offset += vec2(2.5, -1.) * sin(time * 8.) * falloff(p, vec2(1074., 645.), vec2(33., 37.));
    } else if (s > 4.5 && s < 5.5) {
      offset += vec2(5., 1.5) * sin(time * 6.) * falloff(p, vec2(1064., 373.), vec2(61., 33.));
      offset += vec2(2., 1.) * sin(time * 10.) * falloff(p, vec2(1354., 649.), vec2(33., 29.));
    } else if (s > 5.5 && s < 6.5) {
      offset += vec2(2., -.9) * sin(time * 8.) * falloff(p, vec2(1350., 655.), vec2(33., 27.));
    }
    return offset;
  }

  vec4 atlasPart(vec2 pixel, vec2 displacement, float halfIndex) {
    vec2 local = (pixel - displacement - vec2(1135., 185.)) / 215.;
    if (min(local.x, local.y) < 0. || max(local.x, local.y) >= 1.) return vec4(0.);
    return texture2D(rig, vec2(.5 * (local.x + halfIndex), local.y));
  }
  float cable(vec2 p, vec2 a, vec2 b) {
    vec2 line = b - a;
    float along = clamp(dot(p - a, line) / dot(line, line), 0., 1.);
    return 1. - smoothstep(.45, 1.25, length(p - a - along * line));
  }
  vec4 rigging(vec2 p) {
    vec2 hookOffset = roof.xy - vec2(0., roof.z);
    vec2 pulley = vec2(1241., 57.);
    vec2 hook = vec2(1241., 193.) + hookOffset;
    float line = max(cable(p, pulley, hook), cable(p, pulley + vec2(4., 0.), hook + vec2(3., 0.)));
    vec4 rope = vec4(vec3(.16, .18, .17) * line, line);
    vec2 local = p - hookOffset;
    if (local.y > 239.) {
      local.x = 1242. + (local.x - 1242.) / roof.w;
      local.y = 239. + (local.y - 239.) / (1. + .12 * (1. - roof.w));
    }
    return over(atlasPart(local, vec2(0.), 1.), rope);
  }
  vec4 wallAt(vec2 p, vec2 projection) {
    float depth = (660. + .048 * p.x - p.y) / (projection.y + .048 * projection.x);
    return texture2D(wall, clamp((p - vec2(projection.x, 1.-projection.y) * depth) / size, 0., 1.));
  }
  vec4 receivingCrew(vec2 p) {
    vec2 local = (p - vec2(1163., 381.)) / vec2(190., 75.);
    if (min(local.x, local.y) < 0. || max(local.x, local.y) >= 1.) return vec4(0.);
    return texture2D(crew, local);
  }
  vec4 workScene(sampler2D photo, float index) {
    vec2 p = uv * size;
    vec4 layer = texture2D(photo, (p - workOffset(p, index)) / size);
    if (index == 4. && stage != 3.) {
      float shadow = atlasPart(p - vec2(4., 4.), roof.xy, 0.).a;
      layer.rgb *= 1. - .19 * contact * shadow;
      return over(receivingCrew(p), over(atlasPart(p, roof.xy, 0.), layer));
    }
    return layer;
  }

  void main() {
    vec2 p = uv * size;
    vec4 result = workScene(currentPhoto, stage);
    if (opening < 1.) {
      vec2 interval = texture2D(timing, uv).rg;
      result *= smoothstep(interval.x - interval.y, interval.x + interval.y, opening);
    }
    if (fraction > 0.) {
      vec2 interval = texture2D(timing, uv).rg;
      float amount = smoothstep(interval.x - interval.y, interval.x + interval.y, fraction);
      result = mix(result, workScene(nextPhoto, nextStage), amount);
    }
    if (wallOpacity > 0.) {
      float shade = wallAt(p, wallProjection.zw).a;
      result.rgb *= 1. - .22 * shade * wallOpacity;
      result = over(wallAt(p, wallProjection.xy) * wallOpacity, result);
    }
    if (tackleOpacity > 0.) {
      vec4 tackle = rigging(p);
      if (stage == 3.) tackle = over(tackle, over(receivingCrew(p), atlasPart(p, roof.xy, 0.)));
      result = over(tackle * tackleOpacity, result);
    }
    gl_FragColor = result;
  }
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
  return shader;
}

export function createPainter(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
  if (!gl) return null;
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const position = gl.getAttribLocation(program, 'position');
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const location = name => gl.getUniformLocation(program, name);
  const uniforms = ['stage', 'nextStage', 'fraction', 'time', 'opening'].map(location);
  const roof = location('roof'), projection = location('wallProjection'), contact = location('contact');
  const wallOpacity = location('wallOpacity'), tackleOpacity = location('tackleOpacity');
  ['currentPhoto', 'nextPhoto', 'rig', 'wall', 'timing', 'crew'].forEach((name, index) => gl.uniform1i(location(name), index));
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const textures = new Map();
  function texture(image) {
    if (textures.has(image)) return textures.get(image);
    const result = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, result);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    textures.set(image, result);
    return result;
  }
  return (sample, images) => {
    const m = movement(sample);
    gl.uniform4f(roof, m.roof.x, m.roof.y, m.roof.retract, m.roof.slingWidth);
    gl.uniform1f(contact, m.roof.contact);
    gl.uniform4fv(projection, m.wallProjection);
    gl.uniform1f(wallOpacity, m.wallOpacity);
    gl.uniform1f(tackleOpacity, m.tackleOpacity);
    const opening = groundOpening(sample.time).photo;
    const values = [sample.current, sample.next, sample.fraction, sample.time, opening];
    uniforms.forEach((uniform, index) => gl.uniform1f(uniform, values[index]));
    const timing = opening < 1 ? matteFor(-1) : sample.fraction > 0 ? matteFor(sample.current) : images[0];
    const crew = sample.current === 4 ? receivers(images[0])
      : sample.next === 4 && sample.fraction > 0 ? receivers(images[1]) : images[2];
    [...images, timing, crew].forEach((image, index) => {
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, texture(image));
    });
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}

// Scale the timing data once per transition. Only alpha changes as the user scrolls.
function flatMask() {
  const canvas = document.createElement('canvas');
  canvas.width = 418;
  canvas.height = 235;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const alpha = ctx.createImageData(canvas.width, canvas.height);
  let stage = null;
  let timing;
  return (current, fraction) => {
    if (stage !== current) {
      ctx.drawImage(matteFor(current), 0, 0, canvas.width, canvas.height);
      timing = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      stage = current;
    }
    const position = fraction * 255;
    for (let i = 0; i < timing.length; i += 4) {
      const centre = timing[i], width = timing[i + 1];
      const t = Math.min(1, Math.max(0, (position - centre + width) / (2 * width)));
      alpha.data[i + 3] = 255 * t * t * (3 - 2 * t);
    }
    ctx.putImageData(alpha, 0, 0);
    return canvas;
  };
}

function drawTruss(ctx, rig, roof) {
  ctx.drawImage(rig, 0, 0, 215, 215, 1135 + roof.x, 185 + roof.y, 215, 215);
}

function drawTackle(ctx, rig, roof) {
  const dy = roof.y - roof.retract;
  ctx.save();
  ctx.strokeStyle = '#292e2b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const offset of [0, 1]) {
    ctx.moveTo(1241 + offset * 4, 57);
    ctx.lineTo(1241 + roof.x + offset * 3, 193 + dy);
  }
  ctx.stroke();
  ctx.translate(roof.x, dy);
  ctx.drawImage(rig, 215, 0, 215, 54, 1135, 185, 215, 54);
  ctx.translate(1242, 239);
  ctx.scale(roof.slingWidth, 1 + .12 * (1 - roof.slingWidth));
  ctx.drawImage(rig, 215, 54, 215, 161, -107, 0, 215, 161);
  ctx.restore();
}

function drawWall(ctx, wall, sx, hy) {
  ctx.save();
  ctx.transform(1 + .048 * sx, .048 * (1 - hy), -sx, hy, 660 * sx, 660 * (1 - hy));
  ctx.drawImage(wall, 0, 0, 1672, 941);
  ctx.restore();
}

// Same timing mattes, contact shadows and lifts when WebGL is unavailable.
export function createFlatPainter(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const scratch = document.createElement('canvas');
  const other = scratch.getContext('2d');
  const maskAt = flatMask();
  function reset(target) {
    target.setTransform(canvas.width / 1672, 0, 0, canvas.height / 941, 0, 0);
    target.clearRect(0, 0, 1672, 941);
  }
  return (sample, [a, b, rig, wall]) => {
    const { current, fraction } = sample;
    const { roof, wallProjection, wallOpacity, tackleOpacity } = movement(sample);
    if (scratch.width !== canvas.width || scratch.height !== canvas.height) {
      scratch.width = canvas.width;
      scratch.height = canvas.height;
    }
    reset(ctx);
    ctx.drawImage(a, 0, 0, 1672, 941);
    const opening = groundOpening(sample.time).photo;
    if (opening < 1) {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(maskAt(-1, opening), 0, 0, 1672, 941);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (current === 4) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = .19 * roof.contact;
      ctx.filter = 'brightness(0)';
      ctx.translate(4, 4);
      drawTruss(ctx, rig, roof);
      ctx.restore();
      drawTruss(ctx, rig, roof);
      ctx.drawImage(receivers(a), 1163, 381);
    }
    if (fraction > 0) {
      const mask = maskAt(current, fraction);
      reset(other);
      other.drawImage(b, 0, 0, 1672, 941);
      other.globalCompositeOperation = 'destination-in';
      other.drawImage(mask, 0, 0, 1672, 941);
      other.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(mask, 0, 0, 1672, 941);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(scratch, 0, 0, 1672, 941);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (wallOpacity > 0) {
      const [sx, hy, shadowX, shadowY] = wallProjection;
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = .22 * wallOpacity;
      ctx.filter = 'brightness(0)';
      drawWall(ctx, wall, shadowX, shadowY);
      ctx.restore();
      ctx.globalAlpha = wallOpacity;
      drawWall(ctx, wall, sx, hy);
      ctx.globalAlpha = 1;
    }
    if (tackleOpacity > 0) {
      const target = tackleOpacity === 1 ? ctx : other;
      if (target === other) reset(other);
      if (current === 3) {
        drawTruss(target, rig, roof);
        target.drawImage(receivers(b), 1163, 381);
      }
      drawTackle(target, rig, roof);
      if (target === other) {
        ctx.globalAlpha = tackleOpacity;
        ctx.drawImage(scratch, 0, 0, 1672, 941);
        ctx.globalAlpha = 1;
      }
    }
  };
}
