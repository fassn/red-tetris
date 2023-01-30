export type Point = {
    x: number
    y: number
}
export type Points = {
    [key: number]: [Point, Point, Point, Point]
}

export type RGBA = { r: number, g: number, b: number, a?: number}
export enum ROTATION {
    FIRST,
    SECOND,
    THIRD,
    FOURTH
}
export type Stack = {
    isFilled: boolean,
    color: RGBA
}
export type PieceType = 'bar'|'left_L'|'right_L'|'cube'|'T'|'Z'|'rev_Z'
export type PieceProps = {
    x: number,
    y: number,
    points: [Point, Point, Point, Point]
    color: RGBA
}
export type TileProps = {
    x: number
    y: number
    dy: number
    gravity: number
    friction: number
    color: RGBA
}

export enum PlayState {
    WAITING,
    READY,
    PLAYING,
    ENDGAME
}

export type PlayerState = {
    host: boolean
    playState: PlayState
}