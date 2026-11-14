/** Plaza axes and physical ground footprint, shared by rendering and navigation. */
export const FOUNTAIN_COURT = {
 x:750, y:496, outerRadius:140, innerRadius:82, passageHalfWidth:24,
 // The projected aspect of the fountain's stone basin (220 / 400).
 depthRatio:.55,
};
export const TOWN_CENTER = { x:FOUNTAIN_COURT.x/1448,y:FOUNTAIN_COURT.y/1086 };
export const FOUNTAIN = { ...TOWN_CENTER,width:846,sourceWidth:768,sourceHeight:796,
  radiusX:400,radiusY:220,anchorX:367,anchorY:584,originY:584/796 };

/** Entrance footing anchored on the owner's northern court. Source coordinates
 * describe physical ground contact, not roof silhouettes or transparent bounds.
 */
export const CASTLE = {
 x:740/1448,y:200/1086,width:3600,sourceWidth:1800,sourceHeight:1068,
 anchorX:899,anchorY:985,
 // [left, top, right, bottom] in the padded source image.
 footprints:[[80,640,1720,858],[560,790,1245,960],[760,940,1045,986]],
 // Columns share exact source pixels; separate footing depths let players pass
 // in front of the recessed wings and behind the projecting gatehouse.
 sections:[[0,560,858],[560,760,960],[760,1045,986],[1045,1245,960],[1245,1800,858]],
 flagRoots:[[167,117],[1629,119]],
};
