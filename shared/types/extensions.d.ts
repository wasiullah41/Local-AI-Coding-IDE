export type ExtensionState = "installed" | "enabled" | "disabled" | "activating" | "active" | "error";
export type ExtensionPermission = "filesystem.read" | "filesystem.write" | "terminal.execute" | "network.request";
export type ExtensionManifest = {
    id: string;
    name: string;
    version: string;
    description: string;
    publisher: string;
    main: string;
    engines: {
        localIDE: string;
    };
    activationEvents: string[];
    contributes: {
        commands: {
            command: string;
            title: string;
        }[];
    };
    permissions: ExtensionPermission[];
};
export type ExtensionInfo = {
    manifest: ExtensionManifest;
    state: ExtensionState;
    installPath: string;
};
