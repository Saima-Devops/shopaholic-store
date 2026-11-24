import type { AdminFormState } from "@/lib/admin-form-state";

/** The form-level error or success line, announced to screen readers. */
export function FormStatus({ state }: { state: AdminFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="type-meta text-oxblood">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="type-meta text-ink">
        {state.message}
      </p>
    );
  }
  return null;
}

/** The message under one input, if the action flagged it. */
export function FieldError({
  state,
  name,
}: {
  state: AdminFormState;
  name: string;
}) {
  const message = state.fieldErrors?.[name];
  if (!message) return null;
  return (
    <p id={`${name}-error`} className="type-meta mt-1 text-oxblood">
      {message}
    </p>
  );
}
