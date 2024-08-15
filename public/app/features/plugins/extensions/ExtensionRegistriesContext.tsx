import { PropsWithChildren, createContext, useContext } from 'react';

import { ReactivePluginExtensionsRegistry } from 'app/features/plugins/extensions/reactivePluginExtensionRegistry';
import { ExposedComponentsRegistry } from 'app/features/plugins/extensions/registry/ExposedComponentsRegistry';

export interface ExtensionRegistriesContextType {
  registries: {
    common: ReactivePluginExtensionsRegistry;
    exposedComponents: ExposedComponentsRegistry;
  };
}

// Using a different context for each registry to avoid unnecessary re-renders
export const ReactiveExtensionRegistryContext = createContext<ReactivePluginExtensionsRegistry | undefined>(undefined);
export const ExposedComponentsRegistryContext = createContext<ExposedComponentsRegistry | undefined>(undefined);

export function useReactiveExtensionRegistryContext(): ExposedComponentsRegistry {
  const context = useContext(ExposedComponentsRegistryContext);
  if (!context) {
    throw new Error('No `ExposedComponentsRegistryContext` found.');
  }
  return context;
}

export function useExposedComponentsRegistry(): ExposedComponentsRegistry {
  const context = useContext(ExposedComponentsRegistryContext);
  if (!context) {
    throw new Error('No `ExposedComponentsRegistryContext` found.');
  }
  return context;
}

export const ExtensionRegistriesProvider = ({
  registries,
  children,
}: PropsWithChildren<ExtensionRegistriesContextType>) => {
  return (
    <ExposedComponentsRegistryContext.Provider value={registries.exposedComponents}>
      <ReactiveExtensionRegistryContext.Provider value={registries.common}>
        {children}
      </ReactiveExtensionRegistryContext.Provider>
    </ExposedComponentsRegistryContext.Provider>
  );
};
