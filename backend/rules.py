"""Parade rules. Every rule inspects a node together with its neighbours."""

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class Issue:
    rule: str
    severity: str  # "error", "warning" or "info"
    message: str

    def to_dict(self):
        return asdict(self)


class Rule(ABC):
    code = "rule"
    severity = "warning"

    @abstractmethod
    def check(self, node):
        """Return a message when the node breaks the rule, otherwise None."""

    def evaluate(self, node):
        message = self.check(node)
        return Issue(self.code, self.severity, message) if message else None


class OpeningRule(Rule):
    code = "opening"
    severity = "error"

    def check(self, node):
        if node.prev is None and node.value.info.is_float:
            return "Una carroza no puede abrir el desfile: debe abrir un grupo a pie."
        if node.prev is None and node.value.info.is_ad:
            return "Un carrito publicitario no puede abrir el desfile: abre un grupo cultural."


class AdCartSpacingRule(Rule):
    code = "ad-spacing"

    def check(self, node):
        prev = node.prev
        if prev and prev.value.info.is_ad and node.value.info.is_ad:
            return "Dos carritos publicitarios seguidos: repártelos a lo largo del desfile."


class ConsecutiveBandRule(Rule):
    code = "consecutive-band"

    def check(self, node):
        prev = node.prev
        if prev and prev.value.info.has_band and node.value.info.has_band:
            return f"Va pegada a otra murga ({prev.value.name}): la música se mezcla."


class MotorFloatGapRule(Rule):
    code = "motor-float-gap"

    def check(self, node):
        prev = node.prev
        if prev and prev.value.info.motorized and node.value.info.motorized:
            return "Dos carrozas motorizadas seguidas: deja un grupo a pie entre ellas por seguridad."


class BottleneckRule(Rule):
    code = "bottleneck"
    severity = "info"

    def check(self, node):
        prev = node.prev
        if prev and prev.value.info.speed < node.value.info.speed:
            return (f"Va detrás de {prev.value.name}, que es más lento: "
                    f"baja de {node.value.info.speed:g} a {prev.value.info.speed:g} m/min.")


class ClosingRule(Rule):
    code = "closing"
    severity = "info"

    def check(self, node):
        if node.next is None and node.prev and not node.value.info.is_float:
            return "Las carrozas son el plato fuerte: se recomienda cerrar el desfile con una."


class RuleBook:
    def __init__(self, rules=None):
        self.rules = rules or [OpeningRule(), ConsecutiveBandRule(), MotorFloatGapRule(),
                               AdCartSpacingRule(), BottleneckRule(), ClosingRule()]

    def review(self, node):
        return [issue for rule in self.rules if (issue := rule.evaluate(node))]

    def is_blocking(self, node):
        """True when the node breaks a rule that is more than informative."""
        return any(issue.severity != "info" for issue in self.review(node))
