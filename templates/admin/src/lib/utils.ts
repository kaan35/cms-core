/**
 * Merges Tailwind class strings. Falsy values are ignored.
 *
 * Note: does NOT resolve conflicting utilities (e.g. `p-6` + `p-4` → both
 * stay in the output). Use explicit base-class overrides or avoid mixing
 * shorthand/longhand padding on the same element.
 */
export function cn(
  ...inputs: (string | undefined | null | false | 0)[]
): string {
  return inputs
    .flat(Infinity as 0)
    .filter(Boolean)
    .join(" ")
    .trim();
}

export type VariantConfig<T extends Record<string, Record<string, string>>> = {
  variants: T;
  defaultVariants: { [K in keyof T]?: keyof T[K] };
};

export function cva<T extends Record<string, Record<string, string>>>(
  baseClass: string,
  config: VariantConfig<T>,
) {
  return (
    props?: { [K in keyof T]?: keyof T[K] } & { className?: string },
  ): string => {
    const className = props?.className;
    const variantProps = props
      ? ({ ...props } as Record<string, string | undefined>)
      : {};
    delete variantProps.className;

    const classes = [baseClass];

    for (const key in config.variants) {
      const activeVal =
        variantProps[key] ??
        (config.defaultVariants[key] as string | undefined);
      if (activeVal !== undefined) {
        classes.push(config.variants[key][activeVal]);
      }
    }

    if (className) classes.push(className);
    return classes.filter(Boolean).join(" ");
  };
}

export type VariantProps<T extends (...args: never[]) => unknown> = NonNullable<
  Parameters<T>[0]
>;
