Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('chrome://remote/content/shared/WindowManager.jsm');
Components.utils.import("resource://gre/modules/osfile.jsm");

// eslint-disable-next-line no-unused-vars
class CDHelper {
	constructor(element) {
		this.componentPathInput = element.querySelector('#component-path');
		this.loadComponentBtn = element.querySelector('#load-component');
		this.loadComponentBtn.addEventListener('click', this.refresh.bind(this));
		this.autoResizeCheckbox = element.querySelector('#auto-resize');
		this.frame = document.getElementById('component-iframe');
		this.frame.contentWindow.document.addEventListener('load', this.resizeWindow.bind(this));
		// this.frame.addEventListener('load', );
		// this.frame.onload = "resizeWindow";
		// console.log(this.frame);
	}

	register() {
		Zotero.CDHelper = this;
	}

	unregister() {
		delete Zotero.CDHelper;
	}

	async refresh() {
		if (this.componentPathInput.value) {
			const path = `chrome://zotero/content/${this.componentPathInput.value}`;
			if (this.frame.contentWindow.location.href === path) {
				this.frame.contentWindow.location.reload();
			}
			else {
				this.frame.src = path;
			}
			if (this.autoResizeCheckbox.checked) {
				setTimeout(this.resizeWindow.bind(this), 200);
			}
		}
	}

	resizeWindow() {
		const componentWindow = Array.from(this.frame.contentWindow.document.childNodes).find(cn => cn.tagName?.toLowerCase() === 'window');
		if (componentWindow) {
			const width = parseInt(componentWindow.getAttribute('width'));
			const height = parseInt(componentWindow.getAttribute('height'));
			if (width) {
				window.innerWidth = width;
			}

			if (height) {
				window.innerHeight = height + 40;
			}
		}
	}
}
