export type SoundName = 'clear' | 'tetris'

const SOUND_FILES: Record<SoundName, string> = {
    clear: '/sounds/clear.mp3',
    tetris: '/sounds/tetris.mp3',
}

class SoundManager {
    private ctx: AudioContext | null = null
    private buffers = new Map<SoundName, AudioBuffer>()
    private loading = false
    private _muted = false
    private _volume = 0.5

    get muted() { return this._muted }
    set muted(v: boolean) { this._muted = v }

    get volume() { return this._volume }
    set volume(v: number) { this._volume = Math.max(0, Math.min(1, v)) }

    /** Resume AudioContext after user gesture (browser autoplay policy). */
    async unlock() {
        if (!this.ctx) {
            this.ctx = new AudioContext()
        }
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume()
        }
        if (!this.loading && this.buffers.size === 0) {
            this.loading = true
            await this.preload()
            this.loading = false
        }
    }

    private async preload() {
        if (!this.ctx) return
        const entries = Object.entries(SOUND_FILES) as [SoundName, string][]
        await Promise.allSettled(
            entries.map(async ([name, url]) => {
                try {
                    const res = await fetch(url)
                    if (!res.ok) return
                    const buf = await res.arrayBuffer()
                    const audio = await this.ctx!.decodeAudioData(buf)
                    this.buffers.set(name, audio)
                } catch {
                    // Sound file not available yet — silently skip
                }
            })
        )
    }

    play(name: SoundName) {
        if (this._muted || !this.ctx || this.ctx.state !== 'running') return
        const buffer = this.buffers.get(name)
        if (!buffer) return

        const source = this.ctx.createBufferSource()
        const gain = this.ctx.createGain()
        source.buffer = buffer
        gain.gain.value = this._volume
        source.connect(gain)
        gain.connect(this.ctx.destination)
        source.start()
    }
}

export const soundManager = new SoundManager()
