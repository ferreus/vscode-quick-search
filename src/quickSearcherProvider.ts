'use strict';
import * as vscode from 'vscode';
import { Item } from './treeitem/Item';
import { Searcher } from './searcher';
import { Input, SearchRequest } from './input';

export class QuickSearcherProvider implements vscode.TreeDataProvider<Item> {
	private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined> = new vscode.EventEmitter<Item | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Item | undefined> = this._onDidChangeTreeData.event;

	private _input: Input;
	private items: Item[] = [];
	private rootMap: { [id: string]: Item } = {};

	readonly workspaceRoot: string = vscode.workspace.rootPath || '';

	constructor() {
		this._input = new Input();
		this._input.searchEvent(searchRequest => this._onSearchRequest(searchRequest));
		vscode.commands.registerCommand('quickSearcher.search', () => this._input.show(''));
		vscode.commands.registerCommand('quickSearcher.searchInFolder', (uri: vscode.Uri) => {
			this._input.show(uri.fsPath.replace(this.workspaceRoot + '/', ''));
		});
		vscode.commands.registerCommand('quickSearcher.openFile', (resourceUri: vscode.Uri, range?: vscode.Range) => this.openResource(resourceUri, range));
		vscode.commands.registerCommand('quickSearcher.clear', () => {
			this._input.clear();
			this.items = [];
			this.rootMap = {};
			this._onDidChangeTreeData.fire();
		});
		vscode.commands.registerCommand('quickSearcher.cancelSearch', () => Searcher.cancel());
		vscode.commands.registerCommand('quickSearcher.clearSearchResult', (item: Item) => {
			this.clearSearchResult(item);
		});
	}

	private openResource(resource: vscode.Uri, range?: vscode.Range): void {
		let options = {
			preview: true,
			selection: range,
		};
		vscode.window.showTextDocument(resource, options);
	}

	getTreeItem(item: Item): vscode.TreeItem {
		return item;
	}

	getChildren(item?: Item): Thenable<Item[]> {
		return this._getChildren(item);
	}

	private async _onSearchRequest(searchRequest: SearchRequest) {
		var searchItem = this.items.find(x => x.id === searchRequest.id);
		if (!searchItem) {
			var resourceUri = vscode.Uri.parse(`silversearch://${searchRequest.searchWord}`);
			searchItem = new Item("search", searchRequest.searchWord ,vscode.TreeItemCollapsibleState.Expanded,resourceUri,searchRequest.searchWord,searchRequest.searchWord);
			searchItem.id = searchRequest.id;
			this.items.push(searchItem);
		}
		searchItem.label = searchRequest.searchWord;

		Searcher.search2(searchRequest, (id, match) => {
			let item = <Item>this.rootMap[match.uri.fsPath];
			if (!item) {
				item = this.rootMap[match.uri.fsPath] = new Item("file", undefined, Searcher.fileCollapsibleState, match.uri, match.uri.fsPath, match.searchedLine);
				if (searchItem) {
					searchItem.add(item);
				}
			}
			item.pushLine(match.lineColumn,match.searchedLine);
			this._onDidChangeTreeData.fire(searchItem);
		});
		this._onDidChangeTreeData.fire();
	}


	private async _getChildren(item?: Item): Promise<Item[]> {
		if (!this.workspaceRoot) {
			vscode.window.showErrorMessage('Workspace Necessary for Search');
			return [];
		}

		if (item) {
			return item.getChildren();
		} else {
			return this.items;
		}
	}

	clearSearchResult(item: Item) {
		let qs = vscode.window.createOutputChannel("quickSearcher");
		qs.appendLine('clear search result:');
		qs.appendLine(JSON.stringify(item));
		this.items = this.items.filter(x => x.label !== item.label);
		this._input.clear();
		this._onDidChangeTreeData.fire();
	}
}


