import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";

export type InputProps = React.ComponentProps<"input"> & {
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  suggestions?: string[];
  onSelectSuggestion?: (suggestion: string) => void;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    type,
    iconStart,
    iconEnd,
    suggestions,
    onSelectSuggestion,
    value,
    defaultValue,
    onChange,
    onFocus,
    onClick,
    onKeyDown,
    onBlur,
    disabled,
    readOnly,
    list,
    ...props
  },
  ref,
) {
  const hasSuggestions = Array.isArray(suggestions);

  // If neither suggestions nor icons are provided, render standard bare input
  if (!hasSuggestions && !iconStart && !iconEnd) {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onFocus={onFocus}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        list={list}
        className={cn(
          "flex h-8.5 w-full min-w-0 rounded-lg border border-border/90 bg-muted/40 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors outline-none hover:border-border hover:bg-muted/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  }

  // When icons are present but suggestions are not provided
  if (!hasSuggestions) {
    return (
      <div className="relative flex items-center w-full">
        {iconStart && (
          <span className="absolute left-2.5 flex items-center pointer-events-none text-muted-foreground [&_svg]:size-4">
            {iconStart}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          data-slot="input"
          disabled={disabled}
          readOnly={readOnly}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onFocus={onFocus}
          onClick={onClick}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          list={list}
          className={cn(
            "flex h-8.5 w-full min-w-0 rounded-lg border border-border/90 bg-muted/40 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors outline-none hover:border-border hover:bg-muted/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
            iconStart && "pl-9",
            iconEnd && "pr-9",
            className,
          )}
          {...props}
        />
        {iconEnd && (
          <span className="absolute right-2.5 flex items-center pointer-events-none text-muted-foreground [&_svg]:size-4">
            {iconEnd}
          </span>
        )}
      </div>
    );
  }

  // Suggestions combobox mode
  const containerRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [currentValue, setCurrentValue] = React.useState<string>(() => {
    if (value !== undefined && value !== null) return String(value);
    if (defaultValue !== undefined && defaultValue !== null) return String(defaultValue);
    return "";
  });

  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      setCurrentValue(String(value));
    }
  }, [value]);

  const filteredSuggestions = React.useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    const query = currentValue.trim().toLowerCase();
    if (!query) return suggestions;
    return suggestions.filter((s) => s.toLowerCase().includes(query));
  }, [suggestions, currentValue]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const itemEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (itemEl && typeof itemEl.scrollIntoView === "function") {
        itemEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = React.useCallback(
    (selectedText: string) => {
      setCurrentValue(selectedText);
      if (innerRef.current) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(innerRef.current, selectedText);
        } else {
          innerRef.current.value = selectedText;
        }

        const tracker = (
          innerRef.current as unknown as {
            _valueTracker?: { setValue: (v: string) => void };
          }
        )._valueTracker;
        if (tracker) {
          tracker.setValue("");
        }

        innerRef.current.dispatchEvent(new Event("input", { bubbles: true }));
        innerRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }

      onSelectSuggestion?.(selectedText);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onSelectSuggestion],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentValue(e.target.value);
    if (suggestions && suggestions.length > 0) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
    onChange?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (suggestions && suggestions.length > 0 && !disabled && !readOnly) {
      setIsOpen(true);
    }
    onFocus?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (suggestions && suggestions.length > 0 && !disabled && !readOnly) {
      setIsOpen(true);
    }
    onClick?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (
        (e.key === "ArrowDown" || e.key === "ArrowUp") &&
        suggestions &&
        suggestions.length > 0 &&
        !disabled &&
        !readOnly
      ) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
      onKeyDown?.(e);
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        if (filteredSuggestions.length > 0) {
          setHighlightedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
        }
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (filteredSuggestions.length > 0) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
        }
        break;
      }
      case "Enter": {
        const item = filteredSuggestions[highlightedIndex];
        if (highlightedIndex >= 0 && item !== undefined) {
          e.preventDefault();
          handleSelect(item);
          return;
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        return;
      }
      case "Tab": {
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      }
      default:
        break;
    }

    onKeyDown?.(e);
  };

  const showChevron = !iconEnd && suggestions && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative flex items-center w-full">
      {iconStart && (
        <span className="absolute left-2.5 flex items-center pointer-events-none text-muted-foreground [&_svg]:size-4">
          {iconStart}
        </span>
      )}
      <input
        ref={innerRef}
        type={type}
        data-slot="input"
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          "flex h-8.5 w-full min-w-0 rounded-lg border border-border/90 bg-muted/40 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors outline-none hover:border-border hover:bg-muted/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          iconStart && "pl-9",
          (iconEnd || showChevron) && "pr-8",
          className,
        )}
        {...props}
      />
      {iconEnd && (
        <span className="absolute right-2.5 flex items-center pointer-events-none text-muted-foreground [&_svg]:size-4">
          {iconEnd}
        </span>
      )}
      {showChevron && (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || readOnly}
          aria-label="Toggle suggestions"
          className="absolute right-2 flex items-center justify-center text-muted-foreground/60 hover:text-foreground cursor-pointer transition-colors p-1 rounded-sm disabled:cursor-not-allowed disabled:opacity-50"
          onMouseDown={(e) => {
            e.preventDefault();
            if (disabled || readOnly) return;
            setIsOpen((prev) => !prev);
            innerRef.current?.focus();
          }}
        >
          <ChevronDownIcon
            className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-180")}
          />
        </button>
      )}

      {isOpen && suggestions && suggestions.length > 0 && (
        <div
          ref={listRef}
          data-slot="input-suggestions"
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[10rem] max-h-60 overflow-y-auto rounded-xl border border-border/80 bg-card p-1 text-card-foreground shadow-2xl backdrop-blur-md outline-none animate-in fade-in-0 zoom-in-95 space-y-0.5"
        >
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((item, index) => {
              const isSelected = item.toLowerCase() === currentValue.trim().toLowerCase();
              const isHighlighted = highlightedIndex === index;
              return (
                <div
                  key={`${item}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-highlighted={isHighlighted ? "" : undefined}
                  className={cn(
                    "relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs outline-none select-none transition-colors hover:bg-muted hover:text-foreground data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
                    isHighlighted && "bg-muted text-foreground",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="flex-1 truncate">{item}</span>
                  {isSelected && <CheckIcon className="size-3.5 text-primary shrink-0" />}
                </div>
              );
            })
          ) : (
            <div className="px-2.5 py-2 text-xs text-muted-foreground text-center select-none">
              No matching suggestions
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export { Input };
