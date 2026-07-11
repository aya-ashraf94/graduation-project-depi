const fs = require('fs');
const file = 'D:/AngPath/GIGS/FinalProject/Frontend/src/app/features/profile/pages/my-profile/my-profile.html';
let html = fs.readFileSync(file, 'utf8');
const lines = html.split('\n');
let result = [];
let i = 0;
let stack = [];
function getIndent(line) {
    const m = line.match(/^(\s*)/);
    return m ? m[1] : '';
}
while (i < lines.length) {
    let line = lines[i];
    let indent = getIndent(line);
    let trimmed = line.trim();
    
    // *ngIf
    let ngIfMatch = trimmed.match(/^(.*?)(<[^>]*?)\s+\*ngIf="([^"]+)"([^>]*>)\s*$/);
    if (ngIfMatch) {
        let before = ngIfMatch[1];
        let tag = ngIfMatch[2];
        let condition = ngIfMatch[3];
        let rest = ngIfMatch[4];
        if (rest.trim().endsWith('/>')) {
            result.push(indent + '@if (' + condition + ') {');
            result.push(indent + before + tag + ' ' + rest.replace('/>', '').trim() + ' />');
            result.push(indent + '}');
            i++; continue;
        }
        let isNgContainer = tag.includes('ng-container');
        if (isNgContainer) {
            result.push(indent + '@if (' + condition + ') {');
            i++;
            stack.push({ type: 'if', indent: indent, ngContainer: true });
            continue;
        }
        result.push(indent + '@if (' + condition + ') {');
        result.push(indent + before + tag + rest);
        let tagName = tag.match(/<(\w+)/);
        stack.push({ type: 'if', indent: indent, tag: tagName ? tagName[1] : null });
        i++; continue;
    }
    
    // *ngFor
    let ngForMatch = trimmed.match(/^(.*?)(<[^>]*?)\s+\*ngFor="([^"]+)"([^>]*>)\s*$/);
    if (ngForMatch) {
        let before = ngForMatch[1];
        let tag = ngForMatch[2];
        let forExpr = ngForMatch[3];
        let rest = ngForMatch[4];
        let forParts = forExpr.match(/let\s+(\w+)\s+of\s+(\S+?)((?:;\s*let\s+(\w+)\s*=\s*(index|first|last|odd|even))*(?:\s*;.*)?)$/);
        if (forParts) {
            let itemVar = forParts[1];
            let collection = forParts[2];
            let extraVars = '';
            if (forParts[3]) {
                let varRe = /let\s+(\w+)\s*=\s*(index|first|last|odd|even)/g;
                let m;
                let vars = [];
                let varMap = { index: '$index', first: '$first', last: '$last', odd: '$odd', even: '$even' };
                while ((m = varRe.exec(forParts[3])) !== null) {
                    vars.push(m[1] + ' = ' + (varMap[m[2]] || m[2]));
                }
                if (vars.length > 0) {
                    extraVars = '; ' + vars.join(', ');
                }
            }
            let track = 'track $index';
            if (tag.includes('ng-container')) {
                result.push(indent + '@for (' + itemVar + ' of ' + collection + '; ' + track + extraVars + ') {');
                i++;
                stack.push({ type: 'for', indent: indent, ngContainer: true });
                continue;
            }
            result.push(indent + '@for (' + itemVar + ' of ' + collection + '; ' + track + extraVars + ') {');
            result.push(indent + before + tag + rest);
            let tagName = tag.match(/<(\w+)/);
            stack.push({ type: 'for', indent: indent, tag: tagName ? tagName[1] : null });
            i++; continue;
        }
    }
    
    // Closing tag
    let closeMatch = trimmed.match(/^<\/(\w+)>\s*$/);
    if (closeMatch) {
        let tagName = closeMatch[1];
        if (stack.length > 0) {
            let top = stack[stack.length - 1];
            if (top.tag && top.tag === tagName) {
                result.push(line);
                result.push(top.indent + '}');
                stack.pop();
                i++; continue;
            }
        }
        if (tagName === 'ng-container' && stack.length > 0) {
            let top = stack[stack.length - 1];
            if (top.ngContainer) {
                result.push(top.indent + '}');
                stack.pop();
                i++; continue;
            }
        }
    }
    
    result.push(line);
    i++;
}
while (stack.length > 0) {
    let top = stack.pop();
    result.push((top.indent || '') + '}');
}
fs.writeFileSync(file, result.join('\n'), 'utf8');
console.log('Done. Lines: ' + result.length);
