import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fieldVariants, FieldWrapper } from "./input-shared";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
}

import { createPortal } from "react-dom";

export function Select({
  className = "",
  label,
  error,
  helperText,
  children,
  id,
  required,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder,
  ...props
}: SelectProps) {
  const generatedId = React.useId();
  const selectId = id || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? "",
  );
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : uncontrolledValue;

  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [coords, setCoords] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

  const options = useMemo(() => {
    const parsed: { value: string; label: string; disabled?: boolean }[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const element = child as React.ReactElement<
          React.ComponentProps<"option">
        >;
        if (element.type === "option") {
          parsed.push({
            disabled: element.props.disabled,
            label: String(element.props.children ?? ""),
            value: String(element.props.value ?? ""),
          });
        } else if (element.type === React.Fragment) {
          React.Children.forEach(element.props.children, (subChild) => {
            if (React.isValidElement(subChild)) {
              const subElement = subChild as React.ReactElement<
                React.ComponentProps<"option">
              >;
              if (subElement.type === "option") {
                parsed.push({
                  disabled: subElement.props.disabled,
                  label: String(subElement.props.children ?? ""),
                  value: String(subElement.props.value ?? ""),
                });
              }
            }
          });
        }
      }
    });
    return parsed;
  }, [children]);

  const selectedOption = options.find(
    (opt) => String(opt.value) === String(currentValue),
  );
  const triggerLabel = selectedOption
    ? selectedOption.label
    : placeholder || "Select an option...";

  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Reset focused index when menu opens/closes (derived state, no effect needed)
  const computedFocusedIndex = useMemo(() => {
    if (!isOpen) return -1;
    if (focusedIndex >= 0) return focusedIndex; // Keep user's keyboard navigation
    // On open: focus the selected item or first item
    const selectedIdx = options.findIndex(
      (opt) => String(opt.value) === String(currentValue),
    );
    return selectedIdx >= 0 ? selectedIdx : 0;
  }, [isOpen, focusedIndex, currentValue, options]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setCoords(null);
    setFocusedIndex(-1); // Reset when closing
  }, []);

  const selectValue = useCallback(
    (val: string) => {
      if (!isControlled) {
        setUncontrolledValue(val);
      }
      if (onChange) {
        // Build a fake change event for compatibility with standard form handlers
        const fakeEvent = {
          currentTarget: {
            name: props.name,
            value: val,
          },
          target: {
            name: props.name,
            value: val,
          },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(fakeEvent);
      }
      closeMenu();
      triggerRef.current?.focus();
    },
    [isControlled, onChange, props.name, closeMenu],
  );

  // Update positioning coords of trigger button when opening or resizing
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updateCoords = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setCoords({
        left: rect.left + window.scrollX,
        top: rect.bottom + window.scrollY,
        width: rect.width,
      });
    };

    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true); // Use capture to handle nested scroll containers

    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEvent = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") {
          closeMenu();
          triggerRef.current?.focus();
          return;
        }

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const activeOptions = options.filter((o) => !o.disabled);
          if (activeOptions.length === 0) return;

          setFocusedIndex((prev) => {
            const currentIdx = activeOptions.findIndex(
              (o) => o.value === activeOptions[prev]?.value,
            );
            let nextIdx = currentIdx;
            if (e.key === "ArrowDown") {
              nextIdx = (currentIdx + 1) % activeOptions.length;
            } else {
              nextIdx =
                (currentIdx - 1 + activeOptions.length) % activeOptions.length;
            }
            return options.findIndex(
              (o) => o.value === activeOptions[nextIdx].value,
            );
          });
        }

        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (
            computedFocusedIndex >= 0 &&
            !options[computedFocusedIndex].disabled
          ) {
            selectValue(options[computedFocusedIndex].value);
          } else {
            closeMenu();
          }
        }
        return;
      }

      // Close on click outside
      if (
        !containerRef.current?.contains(e.target as Node) &&
        listboxRef.current &&
        !listboxRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleEvent);
    document.addEventListener("keydown", handleEvent);
    return () => {
      document.removeEventListener("mousedown", handleEvent);
      document.removeEventListener("keydown", handleEvent);
    };
  }, [isOpen, computedFocusedIndex, options, selectValue, closeMenu]);

  // Scroll focused item into view inside the dropdown
  useEffect(() => {
    if (computedFocusedIndex >= 0 && listboxRef.current) {
      const items = listboxRef.current.querySelectorAll("[role='option']");
      const activeItem = items[computedFocusedIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [computedFocusedIndex]);

  return (
    <FieldWrapper
      label={label}
      error={error}
      helperText={helperText}
      htmlFor={selectId}
      required={required}
      className="flex-1 my-auto space-y-2"
    >
      {(describedBy) => (
        <div className="relative w-full" ref={containerRef}>
          {/* Hidden native select for standard HTML form/ref/validation compatibility */}
          <select
            id={selectId}
            name={props.name}
            value={currentValue}
            required={required}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            className="sr-only"
            tabIndex={-1}
            onChange={() => {}}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Premium Shadcn Custom Trigger */}
          <button
            ref={triggerRef}
            type="button"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={`${selectId}-listbox`}
            aria-describedby={describedBy}
            onClick={() => {
              if (!isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({
                  left: rect.left + window.scrollX,
                  top: rect.bottom + window.scrollY,
                  width: rect.width,
                });
              }
              setIsOpen((v) => !v);
            }}
            className={cn(
              fieldVariants({ error: error ? "true" : "false" }),
              "flex w-full items-center justify-between bg-background px-3 py-2 text-sm text-left shadow-sm cursor-pointer select-none rounded-lg border focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
              className,
            )}
            disabled={props.disabled}
          >
            <span className="block truncate">{triggerLabel}</span>
            <ChevronDown
              className="h-4 w-4 opacity-50 shrink-0 transition-transform duration-200"
              aria-hidden="true"
              style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
            />
          </button>

          {/* Floating Dropdown Listbox - Portaled to body to prevent card layout clipping and push */}
          {isOpen &&
            coords &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                id={`${selectId}-listbox`}
                ref={listboxRef}
                role="listbox"
                style={{
                  left: `${coords.left}px`,
                  minWidth: `${coords.width}px`,
                  position: "absolute",
                  top: `${coords.top + 4}px`,
                }}
                className="z-50 max-h-60 overflow-auto rounded-lg border border-border bg-card text-card-foreground p-1 shadow-lg focus:outline-none animate-in fade-in duration-100 zoom-in-95 min-w-[130px]"
              >
                {options.length === 0 ? (
                  <div className="py-2 px-3 text-xs text-muted-foreground text-center">
                    No options available
                  </div>
                ) : (
                  options.map((opt, index) => {
                    const isSelected =
                      String(opt.value) === String(currentValue);
                    const isFocused = index === computedFocusedIndex;

                    return (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => !opt.disabled && selectValue(opt.value)}
                        onMouseEnter={() =>
                          !opt.disabled && setFocusedIndex(index)
                        }
                        className={cn(
                          "relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none transition-colors duration-150",
                          isSelected
                            ? "bg-accent/40 font-medium text-foreground"
                            : "text-foreground/80",
                          isFocused && "bg-accent text-accent-foreground",
                          opt.disabled &&
                            "pointer-events-none opacity-50 cursor-not-allowed",
                        )}
                      >
                        {isSelected && (
                          <span className="absolute left-2.5 flex h-4.5 w-4.5 items-center justify-center">
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                        <span className="block truncate">{opt.label}</span>
                      </div>
                    );
                  })
                )}
              </div>,
              document.body,
            )}
        </div>
      )}
    </FieldWrapper>
  );
}
