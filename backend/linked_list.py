"""Doubly linked list that stores parade participants.

Each node knows its previous and next neighbour, so the parade can be
reordered (remove + insert) in O(1) once the node is located. A dictionary
id -> node is kept as an index so locating a node is also O(1).
"""


class Node:
    __slots__ = ("value", "prev", "next")

    def __init__(self, value):
        self.value = value
        self.prev = None
        self.next = None


class DoublyLinkedList:
    def __init__(self):
        self.head = None
        self.tail = None
        self._index = {}

    def append(self, value):
        node = Node(value)
        self._index[value.id] = node
        if self.tail is None:
            self.head = self.tail = node
        else:
            node.prev = self.tail
            self.tail.next = node
            self.tail = node
        return node

    def insert(self, value, anchor_id, before=False):
        """Insert a value right before or after the anchor node."""
        anchor = self.find(anchor_id)
        if not before and anchor is self.tail:
            return self.append(value)

        node = Node(value)
        self._index[value.id] = node
        if before:
            node.prev, node.next = anchor.prev, anchor
        else:
            node.prev, node.next = anchor, anchor.next

        if node.prev:
            node.prev.next = node
        else:
            self.head = node
        node.next.prev = node  # node.next always exists in this branch
        return node

    def remove(self, key):
        """Unlink the node and return the value it held."""
        node = self.find(key)
        del self._index[key]
        if node.prev:
            node.prev.next = node.next
        else:
            self.head = node.next
        if node.next:
            node.next.prev = node.prev
        else:
            self.tail = node.prev
        node.prev = node.next = None
        return node.value

    def find(self, key):
        try:
            return self._index[key]
        except KeyError:
            raise KeyError(f"No existe el participante {key}") from None

    def __iter__(self):
        current = self.head
        while current:
            yield current
            current = current.next

    def __len__(self):
        return len(self._index)
