let instanceURI: string;

export const getInstanceURI: () => string = () => instanceURI;
export const setInstanceURI: (newInstanceURI: string) => void = (
    newInstanceURI
) => (instanceURI = newInstanceURI);
