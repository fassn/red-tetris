import { TILEWIDTH, TILEHEIGHT, SPACING } from "./config"
import { Points } from "./types"

const w = TILEWIDTH+SPACING
const h = TILEHEIGHT+SPACING

const bar: Points = {
    0: [{x: 0, y: 0}, {x: w, y: 0}, {x: 2*w, y: 0}, {x: 3*w, y: 0}],
    1: [{x: 2*w, y: 0}, {x: 2*w, y: h}, {x: 2*w, y: 2*h}, {x: 2*w, y: 3*h}],
    2: [{x: 0, y: h}, {x: w, y: h}, {x: 2*w, y: h}, {x: 3*w, y: h}],
    3: [{x: w, y: 0}, {x: w, y: h}, {x: w, y: 2*h}, {x: w, y: 3*h}],
}
const left_L: Points = {
    0: [{x: 0, y: 0}, {x: 0, y: h}, {x: w, y: h}, {x: 2*w, y: h}],
    1: [{x: 2*w, y: 0}, {x: w, y: 0}, {x: w, y: h}, {x: w, y: 2*h}],
    2: [{x: 2*w, y: 2*h}, {x: 2*w, y: h}, {x: w, y: h}, {x: 0, y: h}],
    3: [{x: 0, y: 2*h}, {x: w, y: 2*h}, {x: w, y: h}, {x: w, y: 0}],
}
const right_L: Points = {
    0: [{x: 2*w, y: 0}, {x: 0, y: h}, {x: w, y: h}, {x: 2*w, y: h}],
    1: [{x: 2*w, y: 2*h}, {x: w, y: 0}, {x: w, y: h}, {x: w, y: 2*h}],
    2: [{x: 0, y: 2*h}, {x: 2*w, y: h}, {x: w, y: h}, {x: 0, y: h}],
    3: [{x: 0, y: 0}, {x: w, y: 2*h}, {x: w, y: h}, {x: w, y: 0}],
}
const cube: Points = {
    0: [{x: 0, y: 0}, {x: w, y: 0}, {x: 0, y: h}, {x: w, y: h}],
    1: [{x: 0, y: 0}, {x: w, y: 0}, {x: 0, y: h}, {x: w, y: h}],
    2: [{x: 0, y: 0}, {x: w, y: 0}, {x: 0, y: h}, {x: w, y: h}],
    3: [{x: 0, y: 0}, {x: w, y: 0}, {x: 0, y: h}, {x: w, y: h}],
}
const T: Points = {
    0: [{x: 0, y: h}, {x: w, y: h}, {x: w, y: 0}, {x: 2*w, y: h}],
    1: [{x: w, y: 0}, {x: w, y: h}, {x: 2*w, y: h}, {x: w, y: 2*h}],
    2: [{x: 2*w, y: h}, {x: w, y: h}, {x: w, y: 2*h}, {x: 0, y: h}],
    3: [{x: w, y: 2*h}, {x: w, y: h}, {x: 0, y: h}, {x: w, y: 0}],
}
const Z: Points = {
    0: [{x: 0, y: 0}, {x: w, y: 0}, {x: w, y: h}, {x: 2*w, y: h}],
    1: [{x: 2*w, y: 0}, {x: 2*w, y: h}, {x: w, y: h}, {x: w, y: 2*h}],
    2: [{x: 2*w, y: 2*h}, {x: w, y: 2*h}, {x: w, y: h}, {x: 0, y: h}],
    3: [{x: 0, y: 2*h}, {x: 0, y: h}, {x: w, y: h}, {x: w, y: 0}],
}
const rev_Z: Points = {
    0: [{x: 0, y: h}, {x: w, y: h}, {x: w, y: 0}, {x: 2*w, y: 0}],
    1: [{x: w, y: 0}, {x: w, y: h}, {x: 2*w, y: h}, {x: 2*w, y: 2*h}],
    2: [{x: 2*w, y: h}, {x: w, y: h}, {x: w, y: 2*h}, {x: 0, y: 2*h}],
    3: [{x: w, y: 2*h}, {x: w, y: h}, {x: 0, y: h}, {x: 0, y: 0}],
}

export const POINTS = {
    bar, left_L, right_L, cube, T, Z, rev_Z
}