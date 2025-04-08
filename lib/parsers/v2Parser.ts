import { Dependency, Group, Parser, V2Manifest } from './types';
import { PkgInfo } from '@snyk/dep-graph';

export class V2Parser implements Parser {
  version = '2';
  manifest: V2Manifest;
  includeDevDependencies: boolean;

  constructor(manifest: V2Manifest, includeDevDependencies?: boolean) {
    this.manifest = manifest;
    this.includeDevDependencies = !!includeDevDependencies;
  }

  pkgInfoFrom(): PkgInfo {
    return {
      name: this.manifest.project.name,
      version: this.manifest.project.version,
    };
  }

  dependenciesFrom(): string[] {
    const depsRegex = /^[a-zA-Z][a-zA-Z0-9_-]*/;
    const deps = this.manifest.project.dependencies || [];
    const newFormatDeps =
      deps
        .map((dep) => dep.match(depsRegex)?.[0])
        .filter((dep) => typeof dep === 'string') || [];
    const legacyFormatDeps = Object.keys(
      this.manifest.tool?.poetry?.dependencies || [],
    );
    return [...newFormatDeps, ...legacyFormatDeps];
  }

  getGroupDependenciesExcludingDev(): string[] {
    if (!this.manifest.tool?.poetry.group) {
      return [];
    }

    const nonDevGroupDeps: string[] = [];
    
    Object.entries(this.manifest.tool.poetry.group).forEach(([groupName, groupData]) => {
      if (groupName.toLowerCase() !== 'dev') {
        const groupDeps = Object.keys(groupData.dependencies || {});
        nonDevGroupDeps.push(...groupDeps);
      }
    });
    
    return nonDevGroupDeps;
  }

  getAllDevDependencyNames(): string[] {
    const devDepsProperty = Object.keys(
      this.manifest.tool?.poetry.group?.dev?.dependencies ?? []
    );
    
    const legacyDevDepsProperty = Object.keys(
      this.manifest.tool?.poetry['dev-dependencies'] ?? []
    );

    return [...devDepsProperty, ...legacyDevDepsProperty];
  }

  getDependencies(): Dependency[] {
    const standardDeps = this.dependenciesFrom();
    const nonDevGroupDeps = this.getGroupDependenciesExcludingDev();
    const allRegularDeps = [...standardDeps, ...nonDevGroupDeps];
    
    const dependencies: Dependency[] = allRegularDeps.map((dep) => ({
      name: dep,
      isDev: false,
    }));
    
    const devDependencies: Dependency[] = (
      this.includeDevDependencies ? this.getAllDevDependencyNames() : []
    ).map((devDep) => ({
      name: devDep,
      isDev: true,
    }));

    return [...dependencies, ...devDependencies].filter(
      (pkg) => pkg.name != 'python',
    );
  }
}
