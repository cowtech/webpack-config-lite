import { parse } from '@babel/parser';
import { readFileSync } from 'fs';
import { resolve } from 'path';
function findVariable(statements, id) {
    const declaration = statements.find((t) => t.type === 'VariableDeclaration' && t.declarations[0].id.name === id);
    return declaration.declarations[1].init.value;
}
function camelCase(source) {
    // tslint:disable-next-line strict-type-predicates
    if (typeof source !== 'string' || !source.length) {
        return source;
    }
    return source
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/(^.|\s.)/g, (...t) => t[1].toUpperCase());
}
export function generateSVG(icon, tag) {
    const { width, height, svgPathData } = icon;
    return `
    <svg id="${tag}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <path fill="currentColor" d="${svgPathData}"></path>
    </svg>
  `;
}
export async function loadFontAwesomeIcons(icons, toLoad) {
    const dependencies = JSON.parse(readFileSync(resolve(process.cwd(), './package.json'), 'utf-8')).dependencies;
    icons.tags = toLoad.reduce((accu, entry, index) => {
        // Manipulate the icon name - Syntax: [alias@]<icon>[:section]
        const [alias, rawName] = entry.includes('@') ? entry.split('@') : [entry.replace(/:.+/, ''), entry];
        const [name, section] = rawName.includes(':') ? rawName.split(':') : [rawName, 'solid'];
        const tag = `i${index}`;
        const iconPackage = `@fortawesome/free-${section}-svg-icons`;
        // Check font-awesome exists in dependencies
        if (!(iconPackage in dependencies)) {
            throw new Error(`In order to load the "${entry}" icon, please add ${iconPackage} to the package.json dependencies.`);
        }
        // Load the icon then add to the definitions
        const iconFile = resolve(process.cwd(), `node_modules/${iconPackage}/fa${camelCase(`${name}`).replace(/\s/g, '')}.js`);
        const iconData = parse(readFileSync(iconFile, 'utf-8')).program.body;
        icons.definitions += generateSVG({
            width: findVariable(iconData, 'width'),
            height: findVariable(iconData, 'height'),
            svgPathData: findVariable(iconData, 'svgPathData')
        }, tag);
        accu[alias] = tag;
        return accu;
    }, {});
}
