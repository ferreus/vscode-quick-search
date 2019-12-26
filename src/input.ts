'use strict';

import * as vscode from 'vscode';

export class SearchRequest {
	constructor(public id: string, public searchWord : string) {}
}
export class Input {
	private qs =  vscode.window.createOutputChannel("quickSearcher");
	private _searchCountInDelay: number = 0;
	private _searchWord: string = '';
	private _searchFolder: string = '';
	private _searchEventEmitter : vscode.EventEmitter<SearchRequest> = new vscode.EventEmitter<SearchRequest>();
	private _searchRequest : SearchRequest = new SearchRequest("","");
	private _idCounter = 0;
	public readonly searchEvent = this._searchEventEmitter.event;

	readonly isSearchBySelectionEnabled: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.searchBySelection.enabled');
	readonly incSearchDelayMs: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.delayMs');
	readonly isIncSearchEnabled: boolean = <boolean> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.enabled');
    readonly incSearchStartBy: number = <number> vscode.workspace.getConfiguration().get('quickSearcher.incrementalSearch.startBy');

	constructor() {
    }

	clear(): void {
        this._searchWord = '';
        this._searchFolder = '';
    }

	async show(searchFolder: string): Promise<void> {
		this._idCounter++;
		this._searchRequest.id = `${this._idCounter}`;
        this._searchFolder = searchFolder;
		const activeEditor = vscode.window.activeTextEditor;
		const selection = activeEditor ? activeEditor.document.getText(activeEditor.selection) : '';
		if (this.isSearchBySelectionEnabled && selection !== '') {
			this._fireEvent(selection);
		}
		await vscode.commands.executeCommand('workbench.view.extension.QuickSearcher');
		const searchWordIn = searchFolder === '' ? 'Workspace Root' : searchFolder;

		const input = await vscode.window.showInputBox({
			value: selection,
			placeHolder: 'Type what you want to get',
			prompt: `Search Word in ${searchWordIn}`,
			validateInput: (input: string) => { return this._incrementalSearch(input); }
		}) || '';
		this._fireEvent(input);
		await vscode.commands.executeCommand('workbench.view.extension.QuickSearcher');
	}

	private _incrementalSearch(input: string): undefined {
		if (!this.isIncSearchEnabled) {
			return;
		}
		if (input.length < this.incSearchStartBy) {
			return;
		}
		this._searchCountInDelay += 1;
		setTimeout(() => {
			this._searchCountInDelay -= 1;
			if (this._searchCountInDelay === 0) {
				this._searchRequest.searchWord = input;
				this._fireEvent(input);

			}
		}, this.incSearchDelayMs);
    }

	private _fireEvent(input: string): void {
		if (input === '' || input === this._searchWord) {
			return;
		}
		this._searchRequest.searchWord = input;
		this._searchWord = input;
		this.qs.appendLine(`_fireEvent, input:${input}, id:${this._searchRequest.id}`);
		this._searchEventEmitter.fire(this._searchRequest);
    }

	get word(): string { return this._searchWord; }
	get folder(): string { return this._searchFolder; }
}