// Bound as SQL parameters; escape LIKE wildcards so names and usernames match literally.
export const searchPattern = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
