// Doorstep or wheel contact in the 1448 × 1086 capital plan. Width controls
// the whole painted object. Only the foundation occupies movement cells.
const lots = [
  ['northwest-townhouse', 'townhouse', 503, 285, 65],
  ['west-cottage', 'cottage-dormer', 340, 377, 96],
  ['east-guild', 'guildhall', 953, 299, 95],
  ['east-market-stall', 'stall', 1076, 307, 35],
  ['east-market-cart', 'handcart', 1034, 305, 27],
  ['west-market-stall', 'stall', 442, 384, 36],
  ['southwest-townhouse', 'townhouse', 480, 602, 62],
  ['southwest-cottage', 'cottage', 477, 714, 96],
  ['southeast-cottage', 'cottage', 994, 594, 94],
  ['southeast-cart', 'handcart', 1081, 609, 29],
  ['southeast-townhouse', 'townhouse-bay', 959, 730, 64],
];

// The outline follows the stone plinth, steps, posts or wheels. X is measured
// from the left of the cropped sprite; Y is measured from the front contact.
// Both distances are fractions of sprite width, preserving the painted angle.
const foundations = {
  'cottage-dormer': {originY:.995, points:[[.012,-.22],[.945,-.22],[.945,-.027],[.598,-.027],[.598,0],[.356,0],[.356,-.027],[.012,-.027]]},
  'townhouse-bay': {originY:.988, points:[[.022,-.23],[.93,-.23],[.93,-.016],[.405,-.016],[.405,0],[.114,0],[.114,-.016],[.022,-.016]]},
  cottage: {originY:.991, points:[[.016,-.22],[.95,-.22],[.934,-.035],[.595,-.035],[.595,0],[.357,0],[.357,-.035],[.016,-.035]]},
  townhouse: {originY:.991, points:[[.031,-.23],[.94,-.23],[.875,-.019],[.382,-.019],[.382,0],[.121,0],[.121,-.019],[.031,-.019]]},
  guildhall: {originY:.991, points:[[.025,-.27],[.966,-.27],[.96,-.065],[.705,-.065],[.705,0],[.35,0],[.35,-.065],[.025,-.065]]},
  stall: {originY:.988, points:[[.07,-.127],[.73,0],[.94,-.137],[.305,-.265]]},
  handcart: {originY:.98, points:[[.24,-.08],[.43,-.045],[.52,0],[.64,-.012],[.76,-.01],[.936,-.177],[.46,-.27]]},
};

export function getTownProperties(mapWidth, mapHeight) {
  const scaleX = mapWidth / 1448;
  const scaleY = mapHeight / 1086;
  return lots.map(([id, type, planX, planY, planWidth]) => {
    const foundation = foundations[type];
    const x = planX * scaleX, y = planY * scaleY, width = planWidth * scaleX;
    const points = foundation.points.map(([u,v]) => [x+(u-.5)*width, y+v*width]);
    return {id, type, x, y, width, points, originY:foundation.originY, footprint: {
      left: Math.min(...points.map(p=>p[0])), right: Math.max(...points.map(p=>p[0])),
      top: Math.min(...points.map(p=>p[1])), bottom: y,
    }};
  });
}
