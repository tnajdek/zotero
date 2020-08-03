/* eslint camelcase: ["error", {allow: ["Zotero_File_Interface", "Zotero_Import_Wizard"]} ] */
/* global Zotero_File_Interface: false */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import FilePicker from 'zotero/filePicker';
import ReactDom from 'react-dom';
import Wizard from './components/wizard';
import WizardPage from './components/wizardPage';
import RadioSet from './components/radioSet';
import ProgressBar from './components/progressBar';
import ImportDatabaseTable from './components/importDatabaseTable';
import { nextHtmlId } from './components/utils';

const ImportWizard = memo(({ libraryID }) => {
	const id = useRef(nextHtmlId());
	const translationResult = useRef(null);
	const tableRef = useRef(null);
	const wizardRef = useRef(null);
	const [dbs, setDbs] = useState([]);
	const [selectedMode, setSelectedMode] = useState('file');
	const [fileHandling, setFileHandling] = useState('store');
	const [file, setFile] = useState(null);
	const [doneLabel, setDoneLabel] = useState(null);
	const [doneDescription, setDoneDescription] = useState(null);
	const [shouldShowErrorButton, setShouldShowErrorButton] = useState(false);
	const [shouldCreateCollection, setShouldCreateCollection] = useState(true);
	const [canAdvance, setCanAdvance] = useState(true);
	const [canRewind, setCanRewind] = useState(true);
	const [canCancel, setCanCancel] = useState(true);
	const [progress, setProgress] = useState(0);

	const importSourceOptions = [
		{ label: Zotero.getString('import.source.file'), value: 'file' },
	];

	if (dbs.length > 0) {
		importSourceOptions.push({ label: 'Mendeley', value: 'mendeley' });
	}

	const fileHandlingOptions = [
		{ label: Zotero.getString('import.fileHandling.store', Zotero.appName), value: 'store' },
		{ label: Zotero.getString('import.fileHandling.link'), value: 'link' }
	];

	const chooseFile = useCallback(async () => {
		var translation = new Zotero.Translate.Import();
		var translators = await translation.getTranslators();
		var fp = new FilePicker();
		fp.init(window, Zotero.getString("fileInterface.import"), fp.modeOpen);
		fp.appendFilters(fp.filterAll);
		var collation = Zotero.getLocaleCollation();
		
		// Add Mendeley DB, which isn't a translator
		var mendeleyFilter = {
			label: "Mendeley Database", // TODO: Localize
			target: "*.sqlite"
		};
		var filters = [...translators];
		filters.push(mendeleyFilter);
		
		filters.sort((a, b) => collation.compareString(1, a.label, b.label));
		for (let filter of filters) {
			fp.appendFilter(filter.label, "*." + filter.target);
		}
		
		var rv = await fp.show();
		if (rv !== fp.returnOK && rv !== fp.returnReplace) {
			return;
		}
		
		Zotero.debug(`File is ${fp.file}`);

		setFile(fp.file);
		setCanAdvance(true);
		wizardRef.current.goTo('page-options');
	}, []);

	/**
	 * When the user clicks "Other…" to choose a file not in the list
	 */
	const chooseMendeleyDB = useCallback(async () => {
		if (tableRef.current) {
			tableRef.current.reset();
		}
		var fp = new FilePicker();
		fp.init(window, Zotero.getString('fileInterface.import'), fp.modeOpen);
		fp.appendFilter("Mendeley Database", "*.sqlite"); // TODO: Localize
		var rv = await fp.show();
		if (rv != fp.returnOK) {
			return;
		}
		setFile(fp.file);
		setCanAdvance(true);
		wizardRef.current.advance();
	}, []);

	const skipToDonePage = useCallback((label, description, showReportErrorButton) => {
		setDoneLabel(label);
		setShouldShowErrorButton(showReportErrorButton);
		setDoneDescription(description);
		
		// When done, move to last page and allow closing
		setCanAdvance(true);
		wizardRef.current.goTo('page-done');
		setCanRewind(false);
	}, []);

	const updateCreateCollectionsCheckbox = useCallback(async () => {
		const sql = "SELECT ROWID FROM collections WHERE libraryID=?1 "
			+ "UNION "
			+ "SELECT ROWID FROM items WHERE libraryID=?1 "
			// Not in trash
			+ "AND itemID NOT IN (SELECT itemID FROM deletedItems) "
			// And not a child item (which doesn't necessarily show up in the trash)
			+ "AND itemID NOT IN (SELECT itemID FROM itemNotes WHERE parentItemID IS NOT NULL) "
			+ "AND itemID NOT IN (SELECT itemID FROM itemAttachments WHERE parentItemID IS NOT NULL) "
			+ "LIMIT 1";
		setShouldCreateCollection(await Zotero.DB.valueQueryAsync(sql, libraryID));
	}, [libraryID]);

	const findFiles = useCallback(async () => {
		try {
			var refreshedDbs;
			switch (selectedMode) {
				case 'file':
					await chooseFile();
					break;
					
				case 'mendeley':
					refreshedDbs = await Zotero_File_Interface.findMendeleyDatabases();
					setDbs(refreshedDbs);
					// This shouldn't happen, because we only show the wizard if there are databases
					if (!refreshedDbs.length) {
						throw new Error("No databases found");
					}
					wizardRef.current.goTo('page-file-list');
					setCanRewind(true);
					setCanCancel(true);
					break;
				
				default:
					throw new Error(`Unknown mode ${selectedMode}`);
			}
		}
		catch (e) {
			skipToDonePage(
				Zotero.getString('general.error'),
				Zotero.getString('fileInterface.importError'),
				true
			);
			throw e;
		}
	}, [chooseFile, selectedMode, skipToDonePage]);

	const handleSourceChange = useCallback((newSource) => {
		setSelectedMode(newSource);
	}, []);

	const handleClose = useCallback(() => {
		window.close();
	}, []);

	const handleModeChosen = useCallback(() => {
		findFiles();
		return false;
	}, [findFiles]);

	const handleSelectedDbChange = useCallback((newSelectedDb) => {
		setFile(newSelectedDb.path);
	}, []);

	const handleReportErrorClick = useCallback(() => {
		Zotero.getActiveZoteroPane().reportErrors();
		window.close();
	}, []);

	const handleCreateCollectionCheckboxChange = useCallback(() => {
		setShouldCreateCollection(!shouldCreateCollection);
	}, [shouldCreateCollection]);

	const handleFileHandlingChange = useCallback((newFileHandling) => {
		setFileHandling(newFileHandling);
	}, []);

	const handleOtherDbClick = useCallback(() => {
		chooseMendeleyDB();
	}, [chooseMendeleyDB]);

	const handleBeforeImport = useCallback(async (translation) => {
		// Unrecognized translator
		if (!translation) {
			// Allow error dialog to be displayed, and then close window
			setTimeout(function () {
				window.close();
			});
			return;
		}
		
		translationResult.current = translation;
		
		// Switch to progress pane
		wizardRef.current.goTo('page-progress');
		translation.setHandler('itemDone', function () {
			setProgress(translation.getProgress());
		});
	}, []);

	const handleUrlClick = useCallback((ev) => {
		Zotero.openInViewer(ev.currentTarget.href);
		window.close();
		ev.preventDefault();
	}, []);

	const handleProgressPageShow = useCallback(() => {
		setCanRewind(false);
	}, []);

	const startImport = useCallback(async () => {
		setCanCancel(false);
		setCanAdvance(false);
		setCanRewind(false);
		
		try {
			let result = await Zotero_File_Interface.importFile({
				file: file,
				onBeforeImport: handleBeforeImport,
				addToLibraryRoot: !shouldCreateCollection,
				linkFiles: fileHandling === 'link'
			});
			
			// Cancelled by user or due to error
			if (!result) {
				window.close();
				return;
			}
			
			let numItems = translationResult.current.newItems.length;
			skipToDonePage(
				Zotero.getString('fileInterface.importComplete'),
				Zotero.getString(`fileInterface.itemsWereImported`, numItems, numItems)
			);
		}
		catch (e) {
			if (e.message == 'Encrypted Mendeley database') {
				let url = 'https://www.zotero.org/support/kb/mendeley_import';
				skipToDonePage(
					Zotero.getString('general.error'),
					// TODO: Localize
					(
						<span>
							The selected Mendeley database cannot be read, likely because it is encrypted.
							See <a href={ url } onClick={ handleUrlClick } className="text-link">How do I import a Mendeley library
							into Zotero?</a> for more information.
						</span>
					)
				);
			}
			else {
				skipToDonePage(
					Zotero.getString('general.error'),
					Zotero.getString('fileInterface.importError'),
					true
				);
			}
			throw e;
		}
	}, [file, fileHandling, handleBeforeImport, handleUrlClick, shouldCreateCollection, skipToDonePage]);

	const goToStart = useCallback(() => {
		wizardRef.current.goTo('page-start');
		setCanAdvance(true);
	}, []);

	useEffect(() => {
		(async () => {
			setDbs(await Zotero_File_Interface.findMendeleyDatabases());
			updateCreateCollectionsCheckbox();
		})();
	}, [updateCreateCollectionsCheckbox]);

	return (
		<Wizard
			canAdvance={ canAdvance }
			canCancel={ canCancel }
			canRewind={ canRewind }
			className="import-wizard"
			onClose={ handleClose }
			ref={ wizardRef }
		>
			<WizardPage
				label={ Zotero.getString('import.whereToImportFrom') }
				onPageAdvance={ handleModeChosen }
				pageId="page-start"
			>
				<RadioSet
					onChange={ handleSourceChange }
					options={ importSourceOptions }
					value={ selectedMode }
				/>
			</WizardPage>
			<WizardPage
				pageId="page-file-list"
				onPageRewound={ goToStart }
				label={ selectedMode === 'mendeley' && Zotero.getString('fileInterface.chooseAppDatabaseToImport', 'Mendeley') }
			>
				{ selectedMode === 'mendeley' ? (
					<React.Fragment>
						<ImportDatabaseTable ref={ tableRef } onChange={ handleSelectedDbChange } files={ dbs } />
						<div className="toolbar-other">
							<button
								title={ Zotero.getString('general.other') }
								onClick={ handleOtherDbClick }
							>
								{ Zotero.getString('general.other') }
							</button>
						</div>
					</React.Fragment>
				) : null }
			</WizardPage>
			<WizardPage
				onPageAdvance={ startImport }
				onPageRewound={ goToStart }
				pageId="page-options"
				label={ Zotero.getString('general.options') }
			>
				<div className="page-options-create-collection">
					<input
						checked={ shouldCreateCollection }
						id={ id.current + '-create-collection-checkbox' }
						label={ Zotero.getString('import.createCollection') }
						onChange={ handleCreateCollectionCheckboxChange }
						type="checkbox"
					/>
					<label htmlFor={ id.current + '-create-collection-checkbox' }>
						{ Zotero.getString('import.createCollection') }
					</label>
				</div>
				<div className="page-options-file-handling">
					<h2>
						{ Zotero.getString("import.fileHandling") }
					</h2>
					<RadioSet
						id={ id.current + 'file-handling-radio' }
						onChange={ handleFileHandlingChange }
						options={ fileHandlingOptions }
						value={ fileHandling }
					/>
				</div>
				<div className="page-options-file-handling-description">
					{ Zotero.getString('import.fileHandling.description', Zotero.appName) }
				</div>
			</WizardPage>
			<WizardPage
				pageId="page-progress"
				label={ Zotero.getString('import.importing') }
			>
				<ProgressBar value={ progress } />
			</WizardPage>
			<WizardPage
				onPageShow={ handleProgressPageShow }
				label={ doneLabel }
				pageId="page-done"
			>
				<div className="page-done-description">
					{ doneDescription }
				</div>
				{ shouldShowErrorButton && (
					<div className="page-done-error">
						<button
							onClick={ handleReportErrorClick }
							title={ Zotero.getString('errorReport.reportError') }
						>
							{ Zotero.getString('errorReport.reportError') }
						</button>
					</div>
				) }
			</WizardPage>
		</Wizard>
	);
});

ImportWizard.init = (domEl, props) => {
	ReactDom.render(<ImportWizard { ...props } />, domEl);
};

ImportWizard.propTypes = {
	libraryID: PropTypes.number,
};

Zotero.ImportWizard = ImportWizard;
