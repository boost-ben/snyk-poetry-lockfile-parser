import * as path from 'path';
import * as fs from 'fs';
import { buildDepGraph } from '../../../lib';

describe('Poetry Groups support', () => {
  const readFixture = (fixtureName: string): string => {
    const fixturePath = path.join(
      __dirname,
      '..',
      '..',
      'fixtures',
      'poetry-with-groups',
      fixtureName,
    );
    return fs.readFileSync(fixturePath, 'utf8');
  };

  it('should include all non-dev group dependencies as normal dependencies', () => {
    const manifestContent = readFixture('pyproject.toml');
    const lockfileContent = readFixture('poetry.lock');

    // Build dependency graph without including dev dependencies
    const graph = buildDepGraph(manifestContent, lockfileContent, false);
    
    // Standard dependencies should be included
    expect(graph.getPkgs().find((pkg) => pkg.name === 'flask')).toBeDefined();
    
    // Group dependencies (except dev) should be included as regular dependencies
    expect(graph.getPkgs().find((pkg) => pkg.name === 'numpy')).toBeDefined();
    expect(graph.getPkgs().find((pkg) => pkg.name === 'pandas')).toBeDefined();
    expect(graph.getPkgs().find((pkg) => pkg.name === 'torch')).toBeDefined();
    expect(graph.getPkgs().find((pkg) => pkg.name === 'torchvision')).toBeDefined();
    
    // Dev dependencies should not be included
    expect(graph.getPkgs().find((pkg) => pkg.name === 'pytest')).toBeUndefined();
    expect(graph.getPkgs().find((pkg) => pkg.name === 'black')).toBeUndefined();
  });

  it('should include dev group dependencies when includeDevDependencies is true', () => {
    const manifestContent = readFixture('pyproject.toml');
    const lockfileContent = readFixture('poetry.lock');

    // Build dependency graph including dev dependencies
    const graph = buildDepGraph(manifestContent, lockfileContent, true);
    
    // Standard dependencies should be included
    expect(graph.getPkgs().find((pkg) => pkg.name === 'flask')).toBeDefined();
    
    // Group dependencies (non-dev) should be included
    expect(graph.getPkgs().find((pkg) => pkg.name === 'numpy')).toBeDefined();
    expect(graph.getPkgs().find((pkg) => pkg.name === 'pandas')).toBeDefined();
    expect(graph.getPkgs().find((pkg) => pkg.name === 'torch')).toBeDefined();
    expect(graph.getPkgs().find((pkg) => pkg.name === 'torchvision')).toBeDefined();
    
    // Dev dependencies should also be included
    expect(graph.getPkgs().find((pkg) => pkg.name === 'pytest')).toBeDefined();
    expect(graph.getPkgs().find((pkg) => pkg.name === 'black')).toBeDefined();
  });
});