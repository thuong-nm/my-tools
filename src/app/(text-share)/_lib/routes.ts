/** The tool's own route. Editing a saved share moves the URL back here: the text has diverged. */
export const TOOL_PATH = "/";

export const sharePath = (code: string): string => `/s/${code}`;
