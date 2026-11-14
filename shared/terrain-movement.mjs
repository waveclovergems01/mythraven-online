import { shortestPath } from './pathfinding.mjs';
import { TERRAIN, layoutToWorld } from './terrain-data.mjs';
import { RIVERSIDE_OAK } from './terrain-props.mjs';
export const WALK_SPEED = 7;
export const MAX_SPEED_LEVEL = 10;
export const DEFAULT_SPEED_LEVEL = 5;
export const speedMultiplier = level => 1 + (level - 1) * 4 / (MAX_SPEED_LEVEL - 1);
export const PLAYER_RADIUS = .65;
// 180 degrees takes 250ms, independent of exploration/walking speed.
export const TURN_SPEED = Math.PI * 4;
export const angleDifference = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
export function turnTowards(from, to, seconds) {
    const difference = angleDifference(from, to), step = TURN_SPEED * Math.max(0, seconds);
    return from + Math.max(-step, Math.min(step, difference));
}
const STEP = TERRAIN.size / TERRAIN.segments;
const HALF = TERRAIN.size / 2;
const navigationCache = new WeakMap();
/** Interpolate the actual PlaneGeometry triangles, rather than a different surface. */
export function terrainHeight(data, x, z) {
    const u = Math.max(0, Math.min(TERRAIN.segments - 1e-6, (x + HALF) / STEP));
    const v = Math.max(0, Math.min(TERRAIN.segments - 1e-6, (z + HALF) / STEP));
    const col = Math.floor(u), row = Math.floor(v), fx = u - col, fz = v - row;
    const i = row * data.side + col, h = data.heights;
    if (fx + fz <= 1)
        return h[i] + fx * (h[i + 1] - h[i]) + fz * (h[i + data.side] - h[i]);
    const bottom = h[i + data.side + 1];
    return bottom + (1 - fx) * (h[i + data.side] - bottom) + (1 - fz) * (h[i + 1] - bottom);
}
/** Shared kinematic navigation; the multiplayer server owns movement state. */
export class TerrainMovement {
    data;
    position;
    spawn;
    heading = 0;
    speedLevel = DEFAULT_SPEED_LEVEL;
    setSpeedLevel(level) {
        if (!Number.isInteger(level) || level < 1 || level > MAX_SPEED_LEVEL) return false;
        this.speedLevel = level; return true;
    }
    route = [];
    next = 0;
    reachable;
    safe;
    constructor(data) {
        this.data = data;
        const cached = navigationCache.get(data);
        if (cached) {
            this.reachable = cached.reachable; this.safe = cached.safe;
            this.spawn = { ...cached.spawn }; this.position = { ...cached.spawn }; return;
        }
        this.reachable = new Uint8Array(TERRAIN.segments * TERRAIN.segments);
        this.safe = new Uint8Array(this.reachable.length);
        const n = TERRAIN.segments;
        // Every corner of a navigation cell stays above the bank with body clearance.
        for (let row = 1; row < n - 1; row++)
            for (let col = 1; col < n - 1; col++) {
                const i = row * data.side + col;
                const x0=col*STEP-HALF,z0=row*STEP-HALF;
                const nearestX=Math.max(x0,Math.min(x0+STEP,RIVERSIDE_OAK.x));
                const nearestZ=Math.max(z0,Math.min(z0+STEP,RIVERSIDE_OAK.z));
                const clearTrunk=Math.hypot(nearestX-RIVERSIDE_OAK.x,nearestZ-RIVERSIDE_OAK.z)>RIVERSIDE_OAK.radius+PLAYER_RADIUS;
                this.safe[row * n + col] = Number(clearTrunk && [i, i + 1, i + data.side, i + data.side + 1]
                    .every(index => data.shoreDistance[index] > 4 + PLAYER_RADIUS && data.heights[index] > 1));
            }
        // Start on the southern city approach so nearby banks establish world scale.
        const preferred = layoutToWorld(740, 900);
        let best = -1, distance = Infinity;
        for (let i = 0; i < this.safe.length; i++) {
            if (!this.safe[i])
                continue;
            const p = this.center({ x: i % n, y: Math.floor(i / n) });
            const d = (p.x - preferred.x) ** 2 + (p.z - preferred.z) ** 2;
            if (d < distance) {
                distance = d;
                best = i;
            }
        }
        if (best < 0)
            throw new Error('No safe terrain spawn');
        this.spawn = this.center({ x: best % n, y: Math.floor(best / n) });
        this.position = { ...this.spawn };
        // A click on the far bank must not send the avatar across water.
        const queue = new Int32Array(this.safe.length);
        let head = 0, tail = 1;
        queue[0] = best;
        this.reachable[best] = 1;
        while (head < tail) {
            const i = queue[head++], x = i % n, y = Math.floor(i / n);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const cx = x + dx, cy = y + dy, key = cy * n + cx;
                if (cx < 0 || cy < 0 || cx >= n || cy >= n || !this.safe[key] || this.reachable[key])
                    continue;
                this.reachable[key] = 1;
                queue[tail++] = key;
            }
        }
        navigationCache.set(data, { reachable: this.reachable, safe: this.safe, spawn: this.spawn });
    }
    get moving() { return this.next < this.route.length; }
    get turning() {
        if (!this.moving) return false;
        const target = this.route[this.next], dx = target.x - this.position.x, dz = target.z - this.position.z;
        return Math.hypot(dx, dz) > 1e-6 && Math.abs(angleDifference(this.heading, Math.atan2(dx, dz))) > 1e-6;
    }
    get height() { return terrainHeight(this.data, this.position.x, this.position.z); }
    get destination() { return this.moving ? this.route[this.route.length - 1] : undefined; }
    cell(p) { return { x: Math.floor((p.x + HALF) / STEP), y: Math.floor((p.z + HALF) / STEP) }; }
    center(cell) { return { x: (cell.x + .5) * STEP - HALF, z: (cell.y + .5) * STEP - HALF }; }
    walkable = (cell) => Number.isInteger(cell.x) && Number.isInteger(cell.y)
        && cell.x >= 0 && cell.y >= 0 && cell.x < TERRAIN.segments && cell.y < TERRAIN.segments
        && this.reachable[cell.y * TERRAIN.segments + cell.x] === 1;
    canStand(point) { return this.walkable(this.cell(point)); }
    clearLine(a, b) {
        const samples = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (STEP / 4)));
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            if (!this.canStand({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }))
                return false;
        }
        return true;
    }
    moveTo(target) {
        if (!this.canStand(target))
            return false;
        if (this.clearLine(this.position, target))
            this.route = [{ ...target }];
        else {
            const start = this.cell(this.position), end = this.cell(target);
            const cells = shortestPath(start, end, { columns: TERRAIN.segments, rows: TERRAIN.segments,
                width: STEP, height: STEP, walkable: this.walkable });
            if (!cells.length)
                return false;
            // Start from the current position, not a backwards trip to this cell's centre.
            // canStep already requires both adjacent cells for every diagonal transition.
            this.route = [...cells.map(cell => this.center(cell)), { ...target }];
        }
        this.next = 0;
        return true;
    }
    stop() { this.route = []; this.next = 0; }
    update(seconds) {
        let time = Math.min(.05, Math.max(0, seconds));
        const speed = WALK_SPEED * speedMultiplier(this.speedLevel);
        while (this.moving && time > 0) {
            const target = this.route[this.next], dx = target.x - this.position.x, dz = target.z - this.position.z;
            const remaining = Math.hypot(dx, dz);
            if (remaining <= 1e-6) { this.next++; continue; }
            const desired = Math.atan2(dx, dz);
            const turnTime = Math.abs(angleDifference(this.heading, desired)) / TURN_SPEED;
            if (turnTime > time) {
                this.heading = turnTowards(this.heading, desired, time);
                break;
            }
            this.heading = desired;
            time -= turnTime;
            const distance = speed * time;
            if (remaining <= distance) {
                this.position.x = target.x;
                this.position.z = target.z;
                this.next++;
                time -= remaining / speed;
            }
            else {
                this.position.x += dx / remaining * distance;
                this.position.z += dz / remaining * distance;
                time = 0;
            }
        }
    }
}
