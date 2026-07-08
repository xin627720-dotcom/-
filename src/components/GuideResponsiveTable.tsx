import type { ReactElement, ReactNode } from "react";
import { Children, isValidElement } from "react";

type TableRow = {
  cells: ReactNode[];
};

export function GuideResponsiveTable({ children }: { children: ReactNode }) {
  const headers = collectHeaderCells(children);
  const rows = collectBodyRows(children);

  return (
    <div className="my-8">
      <div className="hidden overflow-x-auto border-y border-[var(--color-border)] md:block">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm [&_tbody]:divide-y [&_tbody]:divide-[var(--color-border)] [&_td]:px-3 [&_td]:py-3 [&_td]:align-top [&_td]:leading-7 [&_td]:text-[var(--color-text-muted)] [&_th]:border-b [&_th]:border-[var(--color-border)] [&_th]:px-3 [&_th]:py-3 [&_th]:font-semibold [&_thead]:bg-[var(--color-surface)] [&_thead]:text-[var(--color-text-primary)]">
          {children}
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row, rowIndex) => {
          const title = row.cells[0];
          const details = row.cells.slice(1);

          return (
            <section key={rowIndex} className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
              <h3 className="text-sm font-semibold leading-6 text-[var(--color-text-primary)]">{title}</h3>
              <dl className="mt-3 space-y-3">
                {details.map((cell, cellIndex) => (
                  <div key={cellIndex}>
                    <dt className="text-[11px] font-bold text-[var(--color-text-soft)]">
                      {headers[cellIndex + 1] || `说明 ${cellIndex + 1}`}
                    </dt>
                    <dd className="mt-1 text-sm leading-7 text-[var(--color-text-muted)]">{cell}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function collectHeaderCells(node: ReactNode) {
  const thead = findElementsByType(node, "thead")[0];
  const headerRow = thead ? findElementsByType(thead, "tr")[0] : null;
  if (!headerRow) return [];

  return findElementsByType(headerRow, "th").map((cell) => textFromNode(cell.props.children));
}

function collectBodyRows(node: ReactNode): TableRow[] {
  const tbody = findElementsByType(node, "tbody")[0];
  const source = tbody || node;

  return findElementsByType(source, "tr")
    .map((row) => ({
      cells: findElementsByType(row, "td").map((cell) => cell.props.children),
    }))
    .filter((row) => row.cells.length > 0);
}

function findElementsByType(node: ReactNode, type: string): Array<ReactElement<{ children?: ReactNode }>> {
  const matches: Array<ReactElement<{ children?: ReactNode }>> = [];

  Children.forEach(node, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return;

    if (child.type === type) {
      matches.push(child);
    }

    if (child.props.children) {
      matches.push(...findElementsByType(child.props.children, type));
    }
  });

  return matches;
}

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);
  return "";
}
