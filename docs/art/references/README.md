# User visual references

ไฟล์ในโฟลเดอร์นี้คัดลอกจาก screenshot ที่ผู้ใช้ส่งในแชต ใช้อ้างอิงทิศทางภาพและอธิบายโครงสร้าง asset เท่านั้น ไม่ใช่ภาพต้นฉบับแบบโปร่งใสที่พร้อมใช้ในเกม

- world-reference.png: gameplay screenshot; elevated view, character/prop scale, visual layering
- sprite-front-reference.png: DevTools preview 720×720 with eight visible poses in a 3×3 arrangement
- sprite-back-reference.png: corresponding rear-facing example

ภาพ sprite เหล่านี้เป็น screenshot มี DevTools และลายตารางแสดง alpha ห้ามเอา screenshot ไปตัดแล้วใช้เป็น sprite ของ Mythraven
ไม่อนุมานว่า 8 ช่องคือ 8 ทิศ และไม่ยืนยัน action จากภาพนิ่ง
หลังการอนุมัติและล้างไฟล์วันที่ 2026-10-19 ให้ใช้ public/assets/characters/novice-male-idle.png, novice-male-walk-w.png และ novice-male-walk-sw.png เป็นภาพอ้างอิงตัวละครที่ใช้อยู่จริง ไม่มีคลังสำเนา master ใน art/references แล้ว

## Permanent novice gait reference — 2026-10-19

Owner-supplied control chart, corrected with built-in image_gen.imagegen (model version not exposed): [novice-male-sprite-control-reference.png](../../../art/references/novice-male-sprite-control-reference.png).

Source attached to edit: C:/Users/WaveC/Downloads/Novice Male Sprite Control Reference.png. Pose B's forward screen-left leg is now RIGHT/red and rear screen-right leg LEFT/blue, including labels, arrows and hip/knee/ankle chains. This image is retained intentionally for future walking generation. It guides anatomy/pose; actual public/assets/characters atlases guide face, hair, outfit, colors and stature. Do not treat the chart as a production sprite sheet.

<details>
<summary>Correction prompt (image_gen.imagegen)</summary>

```text
Use case: precise-object-edit / text-localization. Edit the attached existing CHARACTER CONTROL REFERENCE chart with one strictly localized annotation correction. Preserve its full layout, resolution/aspect ratio, character art, every other panel, header and all other text. This is an instructional reference sheet, not new artwork.
ONLY the annotated Pose B at the BOTTOM CENTER-RIGHT (not Pose A, not the clean-view inset) has swapped LEG annotations. The figure faces screen-left, so the boot extending toward screen-left is the FORWARD leg, and the boot extending toward screen-right is the BACK leg.
Required exact correction:
1. The forward leg extending toward screen-left must be the character's RIGHT leg. Change the complete currently BLUE leg bone chain from hip through knee to forward ankle/boot into RED, with red rings/lines matching existing red annotation style. Change the lower-left label and arrow currently reading "L Leg Back (character’s left)" into a RED outlined/red text label reading exactly "R Leg Forward" on the first line and "(character's right)" on the second line. Its red arrow must point to this forward screen-left leg.
2. The back leg extending toward screen-right must be the character's LEFT leg. Change the complete currently RED leg bone chain from hip through knee to rear ankle/boot into BLUE, matching existing blue annotation style. Change the lower-right label and arrow currently reading "R Leg Forward (character’s right)" into a BLUE outlined/blue text label reading exactly "L Leg Back" on the first line and "(character's left)" on the second line. Its blue arrow must point to this rear screen-right leg.
Do NOT move/redraw the actual character's legs, boots or body. This is a label/arrow/bone-color correction only, not a new pose. Do not change any arms or arm labels. Leave Pose B L Arm Forward blue and R Arm Back red exactly as-is. Keep yellow center line and pelvis center yellow. No changes to Pose A, idle rows, other skeleton views, color legend or clean-view insets.
Style: preserve the supplied painted fantasy character artwork and existing blue/white instructional chart design verbatim; readable clean existing typography. Opaque background exactly as supplied. Deliver the entire corrected reference sheet with all original panels, not a crop.
```
</details>


## Pose A arm correction
The owner requested that the annotated Pose A match its adjacent clean view. RIGHT arm now swings forward toward screen-left (red), LEFT arm back toward screen-right (blue), with matching callout arrows and bone colors. Pose A legs and corrected Pose B remain unchanged in meaning. Updated the same permanent reference in place using image_gen.imagegen; actual model not exposed. Input was the existing project reference, including the earlier Pose B correction.

<details>
<summary>Pose A correction prompt</summary>

```text
Use case: precise-object-edit. Edit the attached existing novice character control chart. Preserve the entire chart, all text/layout, all panels, opaque background, resolution and aspect ratio. This is a localized correction to ONLY the ARMS of the annotated Pose A figure in the BOTTOM LEFT. The adjacent "Pose A (clean view)" inset is the visual authority for the arm pose; leave that clean inset unchanged.
The current annotated Pose A wrongly marks the arm forward toward screen-left BLUE/left and the arm trailing toward screen-right RED/right. Correct this so the annotated figure and its clean view match:
- CHARACTER'S RIGHT arm must swing FORWARD toward SCREEN LEFT, exactly like the forward arm in the adjacent Pose A clean-view inset. It is the far arm; its shoulder/upper arm may be partly occluded by the torso. The visible elbow/wrist/hand extend to the left of torso. All its bone segments and shoulder/elbow/wrist rings must be RED.
- CHARACTER'S LEFT arm must swing BACK toward SCREEN RIGHT, exactly like the near arm in the adjacent Pose A clean-view inset. Its near shoulder pauldron connects naturally to the upper arm sloping down toward the rear elbow/glove at screen-right. All its bone segments and shoulder/elbow/wrist rings must be BLUE.
Match the actual painted arm silhouettes, shoulder attachments, elbow bend, glove placement and occlusion to the clean-view pose, not just words. Remove the old opposite colored arm traces, no duplicate bones or hands.
The label WORDING is already semantically correct but it must point to the correct arm: put RED "R Arm Forward" / "(character's right)" on the LEFT side of the Pose A figure, with a red arrow to the forward red right arm; put BLUE "L Arm Back" / "(character's left)" on its RIGHT side, with a blue arrow to the trailing blue left arm. Move these two arm callouts as necessary, no crossed confusing arrows. Keep the same typography and label design.
Do NOT modify Pose A's legs, leg bones or leg labels: blue LEFT leg forward screen-left and red RIGHT leg back screen-right remain correct. Keep yellow spine/pelvis unchanged. Do NOT change Pose B at all: its previously corrected red RIGHT leg forward and blue LEFT leg back MUST remain. Do NOT change any of the eight idle views, middle skeletal panels, legend, headers, or either clean view.
Deliver the complete corrected chart, not a crop; faint existing character outlines, original soft painted fantasy illustration, existing blue/white chart design. No new panels, no extra labels, no watermark.
```
</details>

## Actual Pose A artwork follow-up
The owner rejected the preceding label-only correction: the painted arms still differed from the clean view. The selected revision was built by adding a skeleton to a crop of the actual Pose A clean view, compositing that figure into the chart, removing the erroneously restored red upper-arm segment, and restoring the middle-left panel's shoulder annotation. Tool: image_gen.imagegen; model not exposed. Only the current chart is retained in the repository; the temporary reference crop was deleted. Actual arm occlusion, not merely bone color, is required in future work. The image remains subject to owner visual review.

<details>
<summary>Selected artwork correction prompts</summary>

```text
Edit this one supplied character image by ADDING a colored anatomical skeleton overlay. Preserve the exact painted character pixels and silhouette as closely as possible; absolutely DO NOT move or redraw any arms, shoulder armor, elbows, gloves, legs, head or clothing. Identical pose and scale on same white background. No text, no labels, no chart.
The character is walking screen-left. Add thin colored bone lines and small hollow white-centered joint rings:
- BLUE is LEFT near arm: starts at the CENTER OF THE LARGE VISIBLE STEEL PAULDRON at upper right of chest (image position approximately x365 y250 in this680x848input), follows the white sleeve down-right to elbow x425 y345 then wrist x464 y415, to the rear glove. This blue arm swings BACK toward screen-right.
- RED is RIGHT far arm: its shoulder and upper arm are HIDDEN behind chest, so DO NOT draw shoulder ball or upperarm line on the torso. Draw only red forearm line between visible emerging elbow at approximately x256 y346 and wrist x182 y370, reaching the glove at screen-left under chest. It swings FORWARD. Red line should be almost horizontal under chest, NOT diagonal from shoulder to fist. Leave occluded skeleton segments invisible.
- BLUE left leg: near hip x310 y472 to forward knee x235 y535 to front ankle x171 y684. RED right leg: far hip x367 y466 to rear knee x435 y560 to rear ankle x496 y700.
- YELLOW head/neck/spine/pelvis center markers following body axis, thin yellow connecting line.
Scale these coordinates proportionally to your output. They locate existing joints; NEVER move artwork to fit coordinates. Keep original body artwork unchanged with simple thin informative overlay. Opaque white background, single annotated character only, no other figures.

---

Use case: compositing. Image1 is a full reference chart. Image2 is the CORRECT replacement annotated Pose A character. Replace ONLY the annotated character illustration at the bottom-left of image1 with image2's character, scaled down proportionally to the original illustration height, feet at same baseline, head near same position.
This is a literal replacement: use image2's actual shoulder, arm silhouettes, sleeves and gloves and bones. Do NOT preserve image1's old Pose A arm art. The key difference is image2's blue near LEFT arm extends down-right BEHIND torso and the red far RIGHT forearm emerges horizontally from UNDER chest toward screen-left, with NO exposed red shoulder or upper-arm segment. Copy these shapes from image2.
Keep existing surrounding Pose A callout labels. Repoint the left red R Arm Forward arrow to the short red forearm at waist/chest height, and the right blue L Arm Back arrow to the blue rear arm. The left-leg and right-leg callouts point to blue forward leg and red rear leg respectively. Fit replacement within existing space, don't overlap labels. Preserve original pale chart background, not the rectangular white background of image2.
Leave EVERYTHING else of image1 unchanged: especially adjacent Pose A clean view, all of Pose B including its correct leg labels, eight idle views, middle panels, legend, headers and all text. Do not replace or resize the clean-view inset. Same full-sheet layout and aspect ratio; entire chart output. No extra images or panels. Original opaque chart background.

---

Precise local erasure edit to the attached chart. ONLY within annotated Pose A at bottom-left:
ERASE the erroneous thin RED diagonal line running from beside the neck/chest (approximately x219,y878) down to the forward RED elbow ring (approximately x207,y902) in the1448x1086chart. This red upper-arm line should NOT EXIST because the right upper arm is completely hidden behind the brown chest. Replace that red diagonal segment and any exposed upper-arm sliver beneath it with the brown torso/ivory vest edge as appropriate. Do not put any red line or red shoulder circle on the chest. Preserve the small red elbow ring at the emerging white sleeve and the short nearly horizontal red forearm line to the forward glove. The right arm must visibly emerge from under the lower chest, with no visible connection up to the neck.
The near BLUE left arm should be the relaxed straight-ish rear arm matching "Pose A (clean view)": visible pauldron, white sleeve sloping down-back to screen-right, brown glove behind waist. Keep its blue overlay on the actual rear arm.
Keep ALL other artwork, panel dimensions, annotations, colors and lettering identical. In particular no changes outside annotated Pose A arms, no changes to either clean inset or any legs or Pose B. Full opaque reference chart output.

---

Precise restoration. Image1 is the edited chart to retain. Image2 is the earlier chart, used ONLY to restore an accidentally removed annotation in the middle-left panel titled LEFT SIDE VIEW (W).
In image1, restore the RED right shoulder joint ring and red shoulder-to-elbow bone line in that MIDDLE-LEFT LEFT SIDE VIEW panel, exactly as shown in image2 (approximately shoulder213,503 to elbow231,554). The red R Arm callout must point to the restored shoulder ring. Do not change that character's artwork.
CRITICAL: retain ALL of image1's bottom Pose A changes. In BOTTOM LEFT Pose A the far right shoulder is hidden, red forearm emerges horizontally under chest, and there must be NO red upper-arm diagonal there. Do NOT copy the old bottom Pose A from image2. Only restore the missing red ring/line in the MIDDLE LEFT panel. All other pixels/layout/art/labels remain as image1, including Pose B. Output the full opaque chart.
```
</details>
