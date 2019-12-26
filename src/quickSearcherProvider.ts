'use strict';
import * as vscode from 'vscode';
import { Item } from './treeitem/Item';
import { Searcher } from './searcher';
import { Input, SearchRequest } from './input';

export class QuickSearcherProvider implements vscode.TreeDataProvider<Item> {
	private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined> = new vscode.EventEmitter<Item | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Item | undefined> = this._onDidChangeTreeData.event;

	private _input: Input;
	private items : Item[] = [];

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

	private async _onSearchRequest(searchRequest:SearchRequest) {
		Searcher.cancel();
		var searchResults = await Searcher.search(this._input);
		var searchItem = this.items.find(x => x.id === searchRequest.id);
		if (!searchItem) {
			var resourceUri = vscode.Uri.parse(`silversearch://${searchRequest.searchWord}`);
			searchItem = new Item("search", this._input.word, vscode.TreeItemCollapsibleState.Expanded,resourceUri,this._input.word,this._input.word);
			searchItem.id = searchRequest.id;
			this.items.push(searchItem);
		}
		searchItem.label = this._input.word;
		searchItem.addAll(searchResults);
		this._onDidChangeTreeData.fire();
	}


	private async _getChildren(item?: Item): Promise<Item[]> {
		if (!this.workspaceRoot) {
			vscode.window.showErrorMessage('Workspace Necessary for Search');
			return [];
		}

		if (item) {
			return item.getLines();
		}  else {
			return this.items;
		}
		/*else if (this._input.word == '') {
			// refresh
			return this.items;
		} else {
			var searchResults = await Searcher.search(this._input);
			
			var searchItem = this.items.find(x => x.label === this._input.word);
			if (!searchItem) {
				var resourceUri = vscode.Uri.parse(`silversearch://${this._input.word}`);
				vscode.window.showInformationMessage('Hello World!, a:'+resourceUri.authority+",p:"+resourceUri.path);
				searchItem = new Item("search", this._input.word, vscode.TreeItemCollapsibleState.Expanded,resourceUri,this._input.word,this._input.word);
				this.items.push(searchItem);
			}
			searchItem.addAll(searchResults);
			return this.items;
		}*/
	}

	clearSearchResult(item: Item) {
		let qs = vscode.window.createOutputChannel("quickSearcher");
		qs.appendLine('clear search result:');
		qs.appendLine(JSON.stringify(item));
		this.items = this.items.filter(x =>x.label !== item.label);
		this._input.clear();
		this._onDidChangeTreeData.fire();
	}
}


