import { TILEWIDTH, TILEHEIGHT, SPACING } from "./config"

export class Point {
    x: number
    y: number
    constructor(x: number, y: number) {
        this.x = x
        this.y = y
    }
}

type Points = {
    0: [Point, Point, Point, Point]
    1: [Point, Point, Point, Point]
    2: [Point, Point, Point, Point]
    3: [Point, Point, Point, Point]
}
const w = TILEWIDTH+SPACING
const h = TILEHEIGHT+SPACING

const bar: Points = {
    0: [new Point(0, 0), new Point(w, 0), new Point(2*w, 0), new Point(3*w, 0)],
    1: [new Point(2*w, 0), new Point(2*w, h), new Point(2*w, 2*h), new Point(2*w, 3*h)],
    2: [new Point(0, h), new Point(w, h), new Point(2*w, h), new Point(3*w, h)],
    3: [new Point(w, 0), new Point(w, h), new Point(w, 2*h), new Point(w, 3*h)],
}
const left_L: Points = {
    0: [new Point(0, 0), new Point(0, h), new Point(w, h), new Point(2*w, h)],
    1: [new Point(2*w, 0), new Point(w, 0), new Point(w, h), new Point(w, 2*h)],
    2: [new Point(2*w, 2*h), new Point(2*w, h), new Point(w, h), new Point(0, h)],
    3: [new Point(0, 2*h), new Point(w, 2*h), new Point(w, h), new Point(w, 0)],
}
const right_L: Points = {
    0: [new Point(2*w, 0), new Point(0, h), new Point(w, h), new Point(2*w, h)],
    1: [new Point(2*w, 2*h), new Point(w, 0), new Point(w, h), new Point(w, 2*h)],
    2: [new Point(0, 2*h), new Point(2*w, h), new Point(w, h), new Point(0, h)],
    3: [new Point(0, 0), new Point(w, 2*h), new Point(w, h), new Point(w, 0)],
}
const cube: Points = {
    0: [new Point(0, 0), new Point(w, 0), new Point(0, h), new Point(w, h)],
    1: [new Point(0, 0), new Point(w, 0), new Point(0, h), new Point(w, h)],
    2: [new Point(0, 0), new Point(w, 0), new Point(0, h), new Point(w, h)],
    3: [new Point(0, 0), new Point(w, 0), new Point(0, h), new Point(w, h)],
}
const T: Points = {
    0: [new Point(0, h), new Point(w, h), new Point(w, 0), new Point(2*w, h)],
    1: [new Point(w, 0), new Point(w, h), new Point(2*w, h), new Point(w, 2*h)],
    2: [new Point(2*w, h), new Point(w, h), new Point(w, 2*h), new Point(0, h)],
    3: [new Point(w, 2*h), new Point(w, h), new Point(0, h), new Point(w, 0)],
}
const Z: Points = {
    0: [new Point(0, 0), new Point(w, 0), new Point(w, h), new Point(2*w, h)],
    1: [new Point(2*w, 0), new Point(2*w, h), new Point(w, h), new Point(w, 2*h)],
    2: [new Point(2*w, 2*h), new Point(w, 2*h), new Point(w, h), new Point(0, h)],
    3: [new Point(0, 2*h), new Point(0, h), new Point(w, h), new Point(w, 0)],
}
const rev_Z: Points = {
    0: [new Point(0, h), new Point(w, h), new Point(w, 0), new Point(2*w, 0)],
    1: [new Point(w, 0), new Point(w, h), new Point(2*w, h), new Point(2*w, 2*h)],
    2: [new Point(2*w, h), new Point(w, h), new Point(w, 2*h), new Point(0, 2*h)],
    3: [new Point(w, 2*h), new Point(w, h), new Point(0, h), new Point(0, 0)],
}
export const POINTS = {
    bar, left_L, right_L, cube, T, Z, rev_Z
}