import { Time } from "grapher/core/GrapherConstants"
import { findClosestTime, last } from "grapher/utils/Util"

export interface TimelineManager {
    isPlaying: boolean
    times: Time[]
    startTime: Time
    endTime: Time
}

interface TimelineControllerOptions {
    msPerTick?: number
    onPlay?: () => void
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class TimelineController {
    private manager: TimelineManager
    private options: TimelineControllerOptions

    constructor(
        manager: TimelineManager,
        options: TimelineControllerOptions = {}
    ) {
        this.manager = manager
        this.options = options
    }

    private get timesAsc() {
        // Note: assumes times is sorted in asc
        return this.manager.times
    }

    get minTime() {
        return this.timesAsc[0]
    }

    get maxTime() {
        return last(this.timesAsc)!
    }

    get startTimeProgress() {
        return (
            (this.manager.startTime - this.minTime) /
            (this.maxTime - this.minTime)
        )
    }

    snapTimes() {
        const { startTime, endTime } = this.manager
        if (startTime === endTime) return

        if (endTime - startTime > 1) return

        // if handles within 1 time of each other, snap to closest time.
        this.manager.startTime = this.manager.endTime
    }

    get endTimeProgress() {
        return (
            (this.manager.endTime - this.minTime) /
            (this.maxTime - this.minTime)
        )
    }

    getNextTime(time: number) {
        // Todo: speed up?
        return this.timesAsc[this.timesAsc.indexOf(time) + 1] ?? this.maxTime
    }

    // By default, play means extend the endTime to the right. Toggle this to play one time unit at a time.
    private rangeMode = true
    toggleRangeMode() {
        this.rangeMode = !this.rangeMode
        return this
    }

    private isAtEnd() {
        return this.manager.endTime === this.maxTime
    }

    private resetToBeginning() {
        const beginning =
            this.manager.endTime !== this.manager.startTime
                ? this.manager.startTime
                : this.minTime
        this.manager.endTime = beginning
    }

    async play(numberOfTicks?: number) {
        this.manager.isPlaying = true

        if (this.isAtEnd()) this.resetToBeginning()

        if (this.options.onPlay) this.options.onPlay()

        // Keep and return a tickCount for easier testability
        let tickCount = 0
        while (this.manager.isPlaying) {
            const nextTime = this.getNextTime(this.manager.endTime)
            if (!this.rangeMode) this.updateStartTime(nextTime)
            this.updateEndTime(nextTime)
            tickCount++
            if (nextTime >= this.maxTime || numberOfTicks === tickCount) {
                this.stop()
                break
            }
            await delay(this.options.msPerTick ?? 0)
        }

        return tickCount
    }

    private stop() {
        this.manager.isPlaying = false
    }

    private pause() {
        this.manager.isPlaying = false
    }

    async togglePlay() {
        if (this.manager.isPlaying) this.pause()
        else await this.play()
    }

    private dragOffsets: [number, number] = [0, 0]

    setDragOffsets(inputTime: number) {
        const { manager } = this
        const closestTime =
            findClosestTime(this.timesAsc, inputTime) ?? inputTime
        this.dragOffsets = [
            manager.startTime - closestTime,
            manager.endTime - closestTime,
        ]
    }

    getTimeFromDrag(inputTime: Time) {
        return this.getClampedTime(
            findClosestTime(this.timesAsc, inputTime) ?? inputTime
        )
    }

    private dragRangeToTime(time: Time) {
        const { minTime, maxTime } = this
        const closestTime = findClosestTime(this.timesAsc, time) ?? time

        let startTime = this.dragOffsets[0] + closestTime
        let endTime = this.dragOffsets[1] + closestTime

        if (startTime < minTime) {
            startTime = minTime
            endTime = this.getClampedTime(
                minTime + (this.dragOffsets[1] - this.dragOffsets[0])
            )
        } else if (endTime > maxTime) {
            startTime = this.getClampedTime(
                maxTime + (this.dragOffsets[0] - this.dragOffsets[1])
            )
            endTime = maxTime
        }

        this.updateStartTime(startTime)
        this.updateEndTime(endTime)
    }

    dragHandleToTime(handle: "start" | "end" | "both", inputTime: number) {
        const { manager } = this

        const time = this.getTimeFromDrag(inputTime)

        const constrainedHandle =
            handle === "start" && time > manager.endTime
                ? "end"
                : handle === "end" && time < manager.startTime
                ? "start"
                : handle

        if (constrainedHandle !== handle) {
            if (handle === "start") this.updateStartTime(manager.endTime)
            else this.updateEndTime(manager.startTime)
        }

        if (manager.isPlaying && !this.rangeMode) {
            this.updateStartTime(time)
            this.updateEndTime(time)
        } else if (handle === "both") this.dragRangeToTime(inputTime)
        else if (constrainedHandle === "start") this.updateStartTime(time)
        else if (constrainedHandle === "end") this.updateEndTime(time)

        return constrainedHandle
    }

    private updateStartTime(time: Time) {
        this.manager.startTime = time
    }

    private updateEndTime(time: Time) {
        this.manager.endTime = time
    }

    resetStartToMin() {
        this.updateStartTime(this.minTime)
    }

    resetEndToMax() {
        this.updateEndTime(this.maxTime)
    }

    private getClampedTime(inputTime: number) {
        const { minTime, maxTime } = this
        return Math.min(maxTime, Math.max(minTime, inputTime))
    }
}
