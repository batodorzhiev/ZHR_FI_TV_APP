sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/ui/model/Filter"
], function(Controller, MessageToast, Filter) {
	"use strict";

	return Controller.extend("ZHR_FI_TV_APP.ZHR_FI_TV_APP.controller.BaseController", {
		getRouter: function() {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		getModel: function(sName) {
			return this.getView().getModel(sName);
		},

		setModel: function(oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		setEnabled: function(arr, enabled) {
			arr.forEach(function(item) {
				var obj = this.byId(item) || sap.ui.getCore().byId(item);
				if (obj) {
					obj.setEnabled(enabled);
				}
			}, this);
		},

		setVisible: function(arr, visible) {
			arr.forEach(function(item) {
				var obj = this.byId(item) || sap.ui.getCore().byId(item);
				if (obj) {
					obj.setVisible(visible);
				}
			}, this);
		},

		getResourceBundle: function() {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		addHistoryEntry: (function() {
			var aHistoryEntries = [];

			return function(oEntry, bReset) {
				if (bReset) {
					aHistoryEntries = [];
				}

				var bInHistory = aHistoryEntries.some(function(entry) {
					return entry.intent === oEntry.intent;
				});

				if (!bInHistory) {
					aHistoryEntries.push(oEntry);
					this.getOwnerComponent().getService("ShellUIService").then(function(oService) {
						oService.setHierarchy(aHistoryEntries);
					});
				}
			};
		})(),

		openDialog: function(e) {
			var dialog = this.getDialog(e);
			if (!dialog) {
				var id = typeof e === "string" ? e : e.getSource().data("id");
				dialog = sap.ui.xmlfragment("fragment.dialog." + id, this);
				this.getView().addDependent(dialog);
			}
			dialog.open();
		},

		cancelDialog: function(e) {
			var dialog = this.getDialog(e);
			dialog.close();
		},

		getDialog: function(e) {
			var id = typeof e === "string" ? e : e.getSource().data("id");
			var dialog = sap.ui.getCore().byId(id);
			return dialog;
		},

		// Event triggered after all fio(employees) data received 
		onInputDataRecieved: function(e) {
			var id = e.getSource().getPath().substr(1);
			var items = this.getFieldGroups(this.getView().getControlsByFieldGroupId(id));
			items.forEach(function(item) {
				item.setBusy(false);
			}, this);
		},

		getFieldGroups: function(items) {
			var fields = [];
			items.forEach(function(item) {
				if (item["mProperties"].hasOwnProperty("fieldGroupIds")) {
					fields.push(item);
				}
			});
			return fields;
		},

		onDownload: function(e, attrName) {
			var dataAttr = attrName ? attrName : "url",
				url = typeof e === "string" ? this.byId(e).data(dataAttr) : e.getSource().data(dataAttr);
			if (url) {
				url.split("~").forEach(function(u) {
					window.open(u);
				});
			} else {
				MessageToast.show("В разработке");
			}
		},

		inputProperties: ["value", "selectedKey", "selected", "dateValue", "selectedIndex"],
		checkValue: function(input) {
			if (input.data("checkProperty")) {
				var state = input.data(input.data("checkProperty")) ? "Success" : "Warning";
				input.setValueState(state);
			} else {
				this.inputProperties.forEach(function(property) {
					if (input.getBindingInfo(property) && input.getProperty(property) && input.getProperty(property) !== "~") {
						input.setValueState("Success");
						if (input.data("checkLength") && input.data("checkLength") !== "0") {
							var value = input.getProperty(property);
							if (input.data("numbers")) {
								value = input.getProperty(property).replace(/[^0-9]/g, '');
							}
							this.checkLength(input, value);
						}
						if ((input.hasOwnProperty("_oMinDate") && !input.getProperty("dateValue")) || (input.data("minValue") && input.getProperty(
								property) <= input.data("minValue")) || input.hasOwnProperty("_oMinDate") && !input._bValid) {
							input.setValueState("Warning");
						}
					}
				}, this);
			}
		},

		checkLength: function(input, value) {
			var checkLength = input.data("checkLength");
			var length = value.replace("-", "").replace("_", "").length.toString();
			if (checkLength !== length) {
				input.setValueState("Warning");
			}
		},

		getItems: function(items, inputsArg) {
			var inputs = inputsArg || [];
			if (!Array.isArray(items)) {
				items = items.getContent();
			}
			items.forEach(function(item) {
				var id = item.getId();
				if ((id.indexOf("vbox") > -1 || id.indexOf("hbox") > -1 || id.indexOf("panel") > -1 || id.indexOf("item") > -1) && item.getVisible()) {
					var innerItems = id.indexOf("panel") > -1 || id.indexOf("item") > -1 ? item.getContent() : item.getItems();
					this.getItems(innerItems, inputs);
					if (id.indexOf("panel") > -1) {
						this.getItems(item.getHeaderToolbar().getContent(), inputs);
					}
				} else {
					this.inputProperties.forEach(function(property) {
						if (item.getBindingInfo(property)) {
							inputs.push(item);
						}
					}, this);
				}
			}, this);
			return inputs;
		},

		getData: function(items) {
			var data = {};
			items.forEach(function(item) {
				var name = item.getProperty("name") || item.data("name");
				if (item.data("checkProperty")) {
					data[name] = item.data(item.data("checkProperty"));
				} else {
					this.inputProperties.forEach(function(property) {
						if (item.getBindingInfo(property) && name) {
							var value = item.getProperty(property);
							if (typeof value === "string") {
								value = value.replace(/_/gi, "");
							}
							if (item.data("type")) {
								if (item.data("type") === "string") {
									value = value.toString();
								} else if (item.data("type") === "boolean") {
									value = (value == "true");
								} else {
									value = Number(value);
								}
							}
							if (item.data("getText") && item.getSelectedItem()) {
								value = item.getSelectedItem().getText();
							}
							if (item.getBindingInfo("dateValue")) {
								value = value ? new Date(value.valueOf() - value.getTimezoneOffset() * 60000) : null;
							}
							if (name.indexOf("~") > -1) {
								var n = name.split("~");
								var v = [];
								if (item.getBindingInfo("secondDateValue")) {
									v.push(value);
									var secondValue = item.getProperty("secondDateValue");
									v.push(secondValue);
								} else {
									v = value.split("~");
								}
								if (item.data("split")) {
									var regexp = ".{1," + item.data("split") + "}";
									var r = new RegExp(regexp, "g");
									v = value.match(r);
								}
								n.forEach(function(house, i) {
									data[house] = v[i];
								});
							} else {
								data[name] = value;
							}
						}
					}, this);
				}
			}, this);
			return data;
		}
	});
});