/**
 * @see https://www.rfc-editor.org/rfc/rfc9457.html
 */
export interface RFC9457Output {
    type?: string; // URI as string
    title?: string;
    status: number;
    detail?: string;
    instance?: string; // URI as string
    properties?: { [key: string]: any };
}
