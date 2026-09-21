"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

function Row({ id, children, disabled }: { id: string; children: React.ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 bg-card", isDragging && "relative z-10 rounded-lg shadow-lg ring-1 ring-border")}
    >
      <button
        type="button"
        disabled={disabled}
        className="touch-none cursor-grab rounded p-2 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing disabled:opacity-40"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

/** Accessible drag-and-drop list (pointer + keyboard). Calls onReorder with the new id order. */
export function SortableList<T extends { id: string }>({ items, onReorder, render, disabled, className }: { items: T[]; onReorder: (ids: string[]) => void; render: (item: T) => React.ReactNode; disabled?: boolean; className?: string }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    onReorder(arrayMove(items, from, to).map((i) => i.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={cn("divide-y", className)}>
          {items.map((item) => (
            <Row key={item.id} id={item.id} disabled={disabled}>
              {render(item)}
            </Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
