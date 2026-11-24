import { shortestPath } from './pathfinding.mjs';
import { TERRAIN } from './terrain-data.mjs';
import { isTreeCellClear } from './terrain-props.mjs';
import { fortificationSurface, isFortificationClear } from './terrain-fortifications.mjs';
import {isBuildingClear,FOUNTAIN_RESERVE_RADIUS} from './city-layout.mjs';
import {FIELD_ARRIVAL, FIELD_LIMIT} from './west-march.mjs';
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
    const deck = fortificationSurface(data,x,z);
    if (deck !== undefined) return deck;
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
    path = '[]';
    aligning = false;
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
                if(data.area==='west-march' && Math.max(-x0,-z0,x0+STEP,z0+STEP)+PLAYER_RADIUS>FIELD_LIMIT) continue;
                const clearTrunk=isTreeCellClear(data,x0,z0,STEP,PLAYER_RADIUS);
                const clearStructure=isFortificationClear(data,x0+STEP/2,z0+STEP/2,PLAYER_RADIUS+STEP/Math.SQRT2)
                  &&isBuildingClear(data,x0+STEP/2,z0+STEP/2,PLAYER_RADIUS+STEP/Math.SQRT2);
                this.safe[row * n + col] = Number(clearTrunk && clearStructure && [i, i + 1, i + data.side, i + data.side + 1]
                    .every(index => (fortificationSurface(data,index%data.side*STEP-HALF,Math.floor(index/data.side)*STEP-HALF,PLAYER_RADIUS)!==undefined)
                      || (data.shoreDistance[index] > 4 + PLAYER_RADIUS && data.heights[index] > 1)));
            }
        // New city arrivals stand on the plaza, just in front of the fountain's southern steps.
        const preferred = data.area === 'west-march' ? FIELD_ARRIVAL :
          { x: 0, z: FOUNTAIN_RESERVE_RADIUS+6 };
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
        if (!this.moving || !this.aligning) return false;
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
        // Supercover traversal: even a very short crossing of a blocked cell matters.
        const cell = this.cell(a), end = this.cell(b), dx = b.x - a.x, dz = b.z - a.z;
        const sx = Math.sign(dx), sz = Math.sign(dz);
        const tx = dx ? STEP / Math.abs(dx) : Infinity, tz = dz ? STEP / Math.abs(dz) : Infinity;
        let x = dx ? ((cell.x + (sx > 0 ? 1 : 0)) * STEP - HALF - a.x) / dx : Infinity;
        let z = dz ? ((cell.y + (sz > 0 ? 1 : 0)) * STEP - HALF - a.z) / dz : Infinity;
        if (!this.walkable(cell) || !this.walkable(end)) return false;
        while (cell.x !== end.x || cell.y !== end.y) {
            if (Math.abs(x - z) < 1e-10) {
                if (!this.walkable({ x: cell.x + sx, y: cell.y }) || !this.walkable({ x: cell.x, y: cell.y + sz })) return false;
                cell.x += sx; cell.y += sz; x += tx; z += tz;
            } else if (x < z) { cell.x += sx; x += tx; }
            else { cell.y += sz; z += tz; }
            if (!this.walkable(cell)) return false;
        }
        return true;
    }
    smoothRoute(points) {
        // String-pull the grid path once per command, rather than steering cell by cell.
        const pulled = [{ ...this.position }];
        for (let i = 0; i < points.length;) {
            let last = points.length - 1;
            while (last > i && !this.clearLine(pulled[pulled.length - 1], points[last])) last--;
            pulled.push(points[last]); i = last + 1;
        }
        const result = [pulled[0]], lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
        for (let i = 1; i < pulled.length - 1; i++) {
            const a = pulled[i - 1], b = pulled[i], c = pulled[i + 1];
            const incoming = Math.hypot(b.x - a.x, b.z - a.z), outgoing = Math.hypot(c.x - b.x, c.z - b.z);
            let rounded = false;
            // Shorten the fillet near trunks/banks; never smooth through collision cells.
            for (let radius = Math.min(3, incoming * .35, outgoing * .35); radius >= .08; radius *= .5) {
                const entry = lerp(b, a, radius / incoming), exit = lerp(b, c, radius / outgoing);
                const curve = [entry], steps = Math.max(4, Math.ceil(radius * 2 / .2));
                for (let j = 1; j <= steps; j++) {
                    const t = j / steps;
                    curve.push(lerp(lerp(entry, b, t), lerp(b, exit, t), t));
                }
                const check = [result[result.length - 1], ...curve, c];
                if (check.slice(1).every((p, j) => this.clearLine(check[j], p))) {
                    result.push(...curve); rounded = true; break;
                }
            }
            if (!rounded) result.push(b);
        }
        result.push(pulled[pulled.length - 1]);
        return result.slice(1);
    }
    restorePath(path, next, turning) {
        // Server-authored corridor: a snapshot must not choose a different side of a tree.
        if (path !== this.path) { this.route = JSON.parse(path); this.path = path; }
        this.next = next; this.aligning = turning;
    }
    planRoute(target) {
        if (!this.canStand(target))
            return undefined;
        if (this.clearLine(this.position, target))
            return [{ ...target }];
        else {
            const start = this.cell(this.position), end = this.cell(target);
            const cells = shortestPath(start, end, { columns: TERRAIN.segments, rows: TERRAIN.segments,
                width: STEP, height: STEP, walkable: this.walkable });
            if (!cells.length)
                return undefined;
            // Start from the current position, not a backwards trip to this cell's centre.
            // canStep already requires both adjacent cells for every diagonal transition.
            return this.smoothRoute([...cells.map(cell => this.center(cell)), { ...target }]);
        }
    }
    moveTo(target) {
        const route=this.planRoute(target);
        if(!route)return false;
        const travelling = this.moving && !this.aligning;
        this.route=route;
        this.next = 0;
        // Small course corrections during a run steer like bends on the existing route.
        const first = this.route[0];
        const desired = Math.atan2(first.x - this.position.x, first.z - this.position.z);
        this.aligning = !travelling || Math.abs(angleDifference(this.heading, desired)) > Math.PI / 6;
        this.path = JSON.stringify(this.route);
        return true;
    }
    stop() { this.route = []; this.next = 0; this.path = '[]'; this.aligning = false; }
    update(seconds) {
        let time = Math.min(.05, Math.max(0, seconds));
        const speed = WALK_SPEED * speedMultiplier(this.speedLevel);
        while (this.moving && time > 0) {
            const target = this.route[this.next], dx = target.x - this.position.x, dz = target.z - this.position.z;
            const remaining = Math.hypot(dx, dz);
            if (remaining <= 1e-6) { this.next++; continue; }
            const desired = Math.atan2(dx, dz);
            if (this.aligning) {
                const turnTime = Math.abs(angleDifference(this.heading, desired)) / TURN_SPEED;
                if (turnTime > time) {
                    this.heading = turnTowards(this.heading, desired, time);
                    break;
                }
                this.heading = desired;
                time -= turnTime;
                this.aligning = false;
            }
            // Only a new command turns in place. Route bends turn while running.
            this.heading = turnTowards(this.heading, desired, Math.min(time, remaining / speed));
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
