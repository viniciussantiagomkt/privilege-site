import Link from "next/link";

interface BreadcrumbProps {
  items: {
    label: string;
    href?: string;
  }[];
}

export function Breadcrumb({
  items,
}: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-[#030F18]/40">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="flex items-center gap-3"
        >
          {item.href ? (
            <Link
              href={item.href}
              className="transition hover:text-[#030F18]"
            >
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}

          {index <
            items.length - 1 && (
            <span>/</span>
          )}
        </div>
      ))}
    </div>
  );
}
