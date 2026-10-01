"""Minute-by-minute simulation of the parade.

Every group walks at its own speed, stops to rest according to its own plan,
and keeps a similar distance to its neighbours:
  * it cannot get closer than MIN_GAP to the group ahead (node.prev), and
  * it cannot get farther than MAX_GAP from the group behind (node.next).
So when a group rests, the ones behind stop and the ones ahead wait for it.
When the last group has passed, the cleanup truck follows the tail.
"""

from .models import CleanupTruck
from .route import format_clock, parse_clock

STEP = 0.25          # minutes simulated per step
SAMPLE_EVERY = 4     # store a position every 4 steps (1 minute)
MIN_GAP = 12         # meters
MAX_GAP = 45         # meters
TRUCK_GAP = 60       # the cleanup truck keeps a longer distance from the last group
NO_REST_ZONE = 200   # nobody rests in the last meters of the route
TIME_LIMIT = 24 * 60


class Walker:
    """Simulation state of one participant."""

    def __init__(self, participant, position, min_gap=MIN_GAP):
        self.participant = participant
        self.position = position          # meters of the head; negative while waiting
        self.min_gap = min_gap
        self.since_rest = 0.0
        self.rest_left = 0.0
        self.rests = []
        self.samples = []
        self.start = None
        self.finish = None
        self.passes = {}

    def max_advance(self, ahead, behind):
        """Meters it can move this step, given its neighbours."""
        if self.finish is not None or self.rest_left > 0:
            return 0.0
        advance = self.participant.info.speed * STEP
        if ahead and ahead.finish is None:
            advance = min(advance, ahead.position - ahead.participant.length - self.min_gap - self.position)
        if behind and self.position > 0:
            advance = min(advance, behind.position + self.participant.length + MAX_GAP - self.position)
        return max(0.0, advance)

    def maybe_rest(self, minute, route_length):
        every, minutes = self.participant.rest_plan
        if minutes and self.since_rest >= every and 0 < self.position < route_length - NO_REST_ZONE:
            self.rest_left = minutes
            self.since_rest = 0.0
            self.rests.append({"start": round(minute, 2), "end": round(minute + minutes, 2),
                               "at": round(self.position)})


class ParadeSimulator:
    def __init__(self, route):
        self.route = route

    def build(self, lineup, start_time):
        walkers = self.line_up(lineup)
        minute, step = 0.0, 0
        while any(w.finish is None for w in walkers.values()) and minute < TIME_LIMIT:
            if step % SAMPLE_EVERY == 0:
                for walker in walkers.values():
                    walker.samples.append(round(walker.position, 1))
            self.advance(lineup, walkers, minute)
            minute += STEP
            step += 1
        for walker in walkers.values():  # final sample so the animation reaches the end
            walker.samples.append(round(walker.position, 1))
        return self.report(walkers.values(), parse_clock(start_time))

    def line_up(self, lineup):
        """Place every group in the waiting area, one behind the other,
        and the cleanup truck behind the tail."""
        walkers, position = {}, 0.0
        for node in lineup:
            walkers[node.value.id] = Walker(node.value, position)
            position -= node.value.length + MIN_GAP
        if walkers:
            walkers[CleanupTruck.id] = Walker(CleanupTruck(), position - (TRUCK_GAP - MIN_GAP), min_gap=TRUCK_GAP)
        return walkers

    def advance(self, lineup, walkers, minute):
        """Move every group from head to tail; neighbours come from node.prev / node.next.
        The cleanup truck goes last and only follows lineup.tail."""
        for node in lineup:
            ahead = walkers[node.prev.value.id] if node.prev else None
            behind = walkers[node.next.value.id] if node.next else None
            self.move(walkers[node.value.id], ahead, behind, minute)
        if lineup.tail:
            self.move(walkers[CleanupTruck.id], walkers[lineup.tail.value.id], None, minute)

    def move(self, walker, ahead, behind, minute):
        length = self.route.length
        if walker.rest_left > 0:
            walker.rest_left = max(0.0, walker.rest_left - STEP)
            return
        moved = walker.max_advance(ahead, behind)
        old = walker.position
        walker.position += moved
        walker.since_rest += moved
        now = minute + STEP

        if walker.start is None and old <= 0 < walker.position:
            walker.start = minute
        for checkpoint in self.route.checkpoints:
            if checkpoint.name not in walker.passes and walker.position >= checkpoint.distance and walker.position > 0:
                walker.passes[checkpoint.name] = now if checkpoint.distance else walker.start
        if walker.finish is None and walker.position - walker.participant.length >= length:
            walker.finish = now
        walker.maybe_rest(now, length)

    def report(self, walkers, base):
        timeline = {}
        for walker in walkers:
            timeline[walker.participant.id] = {
                "start": walker.start or 0,
                "finish": walker.finish or TIME_LIMIT,
                "passes": [{"checkpoint": c.name, "time": format_clock(base + walker.passes.get(c.name, 0))}
                           for c in self.route.checkpoints],
                "rests": walker.rests,
                "rest_total": round(sum(r["end"] - r["start"] for r in walker.rests), 1),
                "track": {"every": STEP * SAMPLE_EVERY, "positions": walker.samples},
            }
        groups = [w for w in walkers if w.participant.id != CleanupTruck.id]
        parade_end = max((w.finish or 0 for w in groups), default=0)
        total = max((w.finish or 0 for w in walkers), default=0)
        summary = {
            "total_minutes": round(total, 1),          # includes the cleanup truck
            "end_time": format_clock(base + parade_end),
            "clean_time": format_clock(base + total),
            "rests": sum(len(w.rests) for w in groups),
        }
        return timeline, summary
