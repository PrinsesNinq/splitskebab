/* Drag board - Aperam Theme v0.3.4 */
/* Drag board: <sel-board> turns .board-column groups of .board-chip items into a kanban-style board (see the HTML tab for the markup).
 * Fires "board:change" on the board: detail = { item, from, to, action } with action "add" (copied out of the source column), "move"
 * (between groups) or "remove" (back to the source). "board:edit" { column } comes from a column's edit button.
 * Native HTML drag and drop does not work on touch screens, so every group also gets an "Add" select and every chip an x button.
 * initBoard(board) is the same behaviour for a board you wire yourself; it returns a dispose function. */
import { ThemeElement, defineElement } from "../theme-lit.js";

const SOURCE = "[data-board-source]";

const chipsOf = (col) => Array.from(col.querySelectorAll(".board-chip"));
const hasItem = (col, id) => chipsOf(col).some((c) => c.dataset.item === id);
const colId = (col) => col.dataset.column;

function ensureRemoveButton(chip) {
	if (chip.querySelector(".board-chip__remove")) return;
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "board-chip__remove";
	btn.setAttribute("aria-label", "Remove");
	btn.textContent = "×";
	chip.append(btn);
}

function addChip(col, template) {
	const chip = template.cloneNode(true);
	chip.querySelector(".board-chip__remove")?.remove();
	ensureRemoveButton(chip);
	col.querySelector(".board-column__list").append(chip);
}

function removeChip(col, id) {
	chipsOf(col).filter((c) => c.dataset.item === id).forEach((c) => c.remove());
}

/** Updates counts, empty hints and the "Add" selects after any change. */
function refresh(board) {
	const source = board.querySelector(SOURCE);
	board.querySelectorAll(".board-column").forEach((col) => {
		const n = chipsOf(col).length;
		const count = col.querySelector("[data-count]");
		if (count) count.textContent = n;
		const empty = col.querySelector(".board-column__empty");
		if (empty) empty.hidden = n > 0;
		const select = col.querySelector(".board-column__add");
		if (select && source) {
			select.replaceChildren(new Option("+ Add…", ""));
			chipsOf(source).filter((c) => !hasItem(col, c.dataset.item))
				.forEach((c) => select.append(new Option(c.querySelector(".board-chip__label").textContent, c.dataset.item)));
		}
	});
}

/** Moves an item between two columns (elements). Returns true when something changed. */
export function moveItem(board, id, fromCol, toCol) {
	if (!fromCol || !toCol || fromCol === toCol) return false;
	const fromSource = fromCol.hasAttribute("data-board-source");
	const toSource = toCol.hasAttribute("data-board-source");
	let action;
	if (toSource) {
		if (fromSource) return false;
		removeChip(fromCol, id);
		action = "remove";
	} else {
		if (hasItem(toCol, id)) return false;
		const chip = chipsOf(fromCol).find((c) => c.dataset.item === id);
		if (!chip) return false;
		addChip(toCol, chip);
		if (!fromSource) removeChip(fromCol, id);
		action = fromSource ? "add" : "move";
	}
	refresh(board);
	board.dispatchEvent(new CustomEvent("board:change", { bubbles: true, detail: { item: id, from: colId(fromCol), to: colId(toCol), action } }));
	return true;
}

/** Wires one board. Returns a function that removes every listener. */
export function initBoard(board) {
	const ac = new AbortController();
	const on = (type, handler) => board.addEventListener(type, handler, { signal: ac.signal });
	const source = board.querySelector(SOURCE);

	board.querySelectorAll(".board-column").forEach((col) => {
		if (col.hasAttribute("data-board-source")) return;
		chipsOf(col).forEach(ensureRemoveButton);
		if (source && !col.querySelector(".board-column__add")) {
			const select = document.createElement("select");
			select.className = "form-select form-select-sm board-column__add mb-2";
			select.setAttribute("aria-label", "Add to this group");
			col.querySelector(".board-column__list").before(select);
		}
	});
	refresh(board);

	on("dragstart", (e) => {
		const chip = e.target.closest(".board-chip");
		if (!chip) return;
		e.dataTransfer.setData("text/plain", chip.dataset.item);
		e.dataTransfer.setData("application/x-board-from", colId(chip.closest(".board-column")));
		e.dataTransfer.effectAllowed = "move";
	});
	on("dragover", (e) => {
		const col = e.target.closest(".board-column");
		if (!col) return;
		e.preventDefault();
		col.classList.add("board-column--drag-over");
	});
	on("dragleave", (e) => {
		const col = e.target.closest(".board-column");
		if (col && !col.contains(e.relatedTarget)) col.classList.remove("board-column--drag-over");
	});
	on("drop", (e) => {
		const col = e.target.closest(".board-column");
		if (!col) return;
		e.preventDefault();
		col.classList.remove("board-column--drag-over");
		const id = e.dataTransfer.getData("text/plain");
		const from = board.querySelector('.board-column[data-column="' + CSS.escape(e.dataTransfer.getData("application/x-board-from")) + '"]');
		if (id) moveItem(board, id, from, col);
	});
	on("dragend", () => board.querySelectorAll(".board-column--drag-over").forEach((c) => c.classList.remove("board-column--drag-over")));

	on("click", (e) => {
		const remove = e.target.closest(".board-chip__remove");
		if (remove) {
			const chip = remove.closest(".board-chip");
			const col = chip.closest(".board-column");
			if (source) moveItem(board, chip.dataset.item, col, source);
			else { chip.remove(); refresh(board); }
			return;
		}
		const edit = e.target.closest(".board-column__edit");
		if (edit) board.dispatchEvent(new CustomEvent("board:edit", { bubbles: true, detail: { column: colId(edit.closest(".board-column")) } }));
	});
	on("change", (e) => {
		const select = e.target.closest(".board-column__add");
		if (!select || !select.value) return;
		moveItem(board, select.value, source, select.closest(".board-column"));
		select.value = "";
	});

	return () => {
		ac.abort();
		board.querySelectorAll(".board-column--drag-over").forEach((c) => c.classList.remove("board-column--drag-over"));
	};
}

export class Board extends ThemeElement {
	setup() {
		return initBoard(this);
	}
}

defineElement("sel-board", Board);

