"""The parade: a doubly linked list of participants plus its rules and timetable."""

from .linked_list import DoublyLinkedList
from .models import CATEGORY_INFO, Category, Participant
from .route import DEFAULT_ROUTE
from .rules import RuleBook
from .simulation import ParadeSimulator


class Parade:
    def __init__(self, participants=(), start_time="10:00", route=DEFAULT_ROUTE):
        self.lineup = DoublyLinkedList()
        for participant in participants:
            self.lineup.append(participant)
        self.start_time = start_time
        self.route = route
        self.rules = RuleBook()
        self.simulator = ParadeSimulator(route)
        self.next_id = max((p.id for p in participants), default=0) + 1

    def add(self, name, category, members, theme="", anchor_id=None, place="after"):
        participant = Participant(self.next_id, name.strip(), Category(category), members, theme.strip())
        if anchor_id is None:
            self.lineup.append(participant)
        else:
            self.lineup.insert(participant, anchor_id, before=place == "before")
        self.next_id += 1
        return participant

    def update(self, participant_id, name, theme=""):
        participant = self.lineup.find(participant_id).value
        participant.name = name.strip()
        participant.theme = theme.strip()

    def move(self, participant_id, target_id, place):
        """Unlink the participant and link it again next to the target."""
        if participant_id == target_id:
            return
        self.lineup.find(target_id)  # fail before unlinking if the target is missing
        participant = self.lineup.remove(participant_id)
        self.lineup.insert(participant, target_id, before=place == "before")

    def auto_arrange(self):
        """Greedy rebuild: take groups by block and skip any that would break a rule
        next to the current tail of the new list. Then spread the ad carts evenly."""
        values = [node.value for node in self.lineup]
        ads = [p for p in values if p.info.is_ad]
        pending = sorted((p for p in values if not p.info.is_ad), key=lambda p: p.info.block)
        arranged = DoublyLinkedList()
        while pending:
            for position, candidate in enumerate(pending):
                node = arranged.append(candidate)
                if not self.rules.is_blocking(node):
                    break
                arranged.remove(candidate.id)
            else:
                position = 0
                arranged.append(pending[0])
            pending.pop(position)

        # insert each ad cart after an evenly spaced cultural group: O(1) per insertion
        anchors = [node.value.id for node in arranged]
        for number, ad in enumerate(ads, start=1):
            spot = round(number * len(anchors) / (len(ads) + 1))
            if spot == 0:
                arranged.append(ad)
            else:
                arranged.insert(ad, anchors[spot - 1])
        self.lineup = arranged

    def snapshot(self):
        timeline, summary = self.simulator.build(self.lineup, self.start_time)
        participants = []
        for position, node in enumerate(self.lineup, start=1):
            participant = node.value
            rest_every, rest_minutes = participant.rest_plan
            participants.append({
                **participant.to_dict(),
                "position": position,
                "label": participant.info.label,
                "icon": participant.info.icon,
                "block": participant.info.block,
                "is_ad": participant.info.is_ad,
                "length": participant.length,
                "rest_every": rest_every,
                "rest_minutes": rest_minutes,
                "prev_id": node.prev.value.id if node.prev else None,
                "next_id": node.next.value.id if node.next else None,
                "issues": [issue.to_dict() for issue in self.rules.review(node)],
                "schedule": timeline[participant.id],
            })

        summary.update({
            "groups": len(participants),
            "members": sum(p["members"] for p in participants),
            "warnings": sum(1 for p in participants for i in p["issues"] if i["severity"] != "info"),
        })
        return {
            "start_time": self.start_time,
            "route": self.route.to_dict(),
            "categories": [{"value": c.value, "label": i.label, "icon": i.icon} for c, i in CATEGORY_INFO.items()],
            "participants": participants,
            "summary": summary,
        }
