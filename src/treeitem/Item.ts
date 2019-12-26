'use strict';
import * as path from 'path';
import * as vscode from 'vscode';

export class Item extends vscode.TreeItem {
	readonly labelLength: number = <number>vscode.workspace.getConfiguration().get('quickSearcher.searchItem.labelLength');
	private children: Item[] = [];
	private range_ : vscode.Range | undefined;
	constructor(private readonly ctxValue: string, public label: string|undefined, public readonly collapsibleState: vscode.TreeItemCollapsibleState, public readonly resourceUri: vscode.Uri, public readonly tooltip: string, public readonly searchWord: string) {
		super(resourceUri, collapsibleState);
		this.description = label === undefined;
	}

	addAll(items: Item[]) {
		this.children = [];
		this.children.push(...items);
	}

	clear() {
		this.children = [];
	}

	pushLine(lineColumn: string, matchedLine: string, searchedLine: string): void {
		const brief = matchedLine.length > this.labelLength ? matchedLine.substr(0, this.labelLength) + '...' : matchedLine;
		const tooltip = `${lineColumn}: ${searchedLine}`;
		var item = new Item("line", brief, vscode.TreeItemCollapsibleState.None, this.resourceUri, tooltip, searchedLine);
		this.children.push(item);
		const [startLine, startChar] = tooltip.split(':').slice(0, 2).map((i) => Number(i) - 1);
		const endChar = startChar + searchedLine.length;
		item.range = new vscode.Range(startLine, startChar, startLine, +endChar); 
	}
	add(item: Item) {
		this.children.push(item);
	}
	getChildren(): Item[] {
		return this.children;
	}
	get iconPath(): {
		light: string | vscode.Uri;
		dark: string | vscode.Uri;
	} | vscode.ThemeIcon {
		return this.collapsibleState === vscode.TreeItemCollapsibleState.None ? {
			light: path.join(__dirname, '..', 'resources', 'light', 'line.svg'),
			dark: path.join(__dirname, '..', 'resources', 'dark', 'line.svg')
		} : vscode.ThemeIcon.File;
	}
	
	get command(): vscode.Command {
		return { command: 'quickSearcher.openFile', title: "Open File", arguments: [this.resourceUri, this.range] };
	}

	get contextValue(): string {
		//return this.collapsibleState == vscode.TreeItemCollapsibleState.None ? 'line' : 'file';
		return this.ctxValue;
	}

	get range(): vscode.Range | undefined {
		if (this.collapsibleState !== vscode.TreeItemCollapsibleState.None || !this.label) {
			return undefined;
		}
		else {
			// decrement since both line and char start by 0
			return this.range_;
		}
	}
	set range(value: vscode.Range | undefined) {
		this.range_ = value;
	}
}