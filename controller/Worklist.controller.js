/*global location history */
sap.ui.define([
	"ZHR_FI_TV_APP/ZHR_FI_TV_APP/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"ZHR_FI_TV_APP/ZHR_FI_TV_APP/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function(BaseController, JSONModel, History, formatter, Filter, FilterOperator, Fragment, MessageBox, MessageToast) {
	"use strict";

	return BaseController.extend("ZHR_FI_TV_APP.ZHR_FI_TV_APP.controller.Worklist", {

		formatter: formatter,

		onInit: function() {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0,
				isEIO: false,
				isEdu: false,
				userPernr: ""
			});
			this.setModel(oViewModel, "worklistView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
			// Add the worklist page to the flp routing history
			this.addHistoryEntry({
				title: this.getResourceBundle().getText("worklistViewTitle"),
				icon: "sap-icon://table-view",
				intent: "#Командировкидлярабочих-display"
			}, true);

			this.getRouter().getRoute("worklist").attachPatternMatched(this._onWorklistMatched, this);

			var model = this.getOwnerComponent().getModel();
			model.metadataLoaded().then(function() {
				var path = model.createKey("/RequestSet", {
					Reinr: "",
					Pernr: ""
				});
				model.read(path, {
					success: function(data) {
						oViewModel.setProperty("/isEIO", data.Role === "eio");
						oViewModel.setProperty("/isEdu", data.Role === "edu");
						oViewModel.setProperty("/userPernr", data.UserPernr);
						oViewModel.setProperty("/supportFlag", data.SupportFlag);
					}
				});
			});
		},

		_onWorklistMatched: function(e) {
			var refresh = e.getParameter("arguments").refresh;
			this.getModel().metadataLoaded().then(function() {
				if (refresh) {
					this.byId("table").getBinding("items").refresh(true);
				}
			}.bind(this));
		},

		onUpdateFinished: function(oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		onPress: function(e) {
			var data = e.getSource().getBindingContext().getObject();
			this.getRouter().navTo("object", {
				Reinr: data.Reinr,
				Pernr: data.Pernr
			});
		},

		onSearch: function(e) {
			var items = this.byId("filterItems").getItems(),
				inputs = this.getItems(items),
				data = this.getData(inputs),
				binding = this.byId("table").getBinding("items"),
				filters = [],
				uname = this.getModel("mock").getProperty("/delegUname");
			inputs.forEach(function(input) {
				var name = input.getName();
				if (name) {
					var isDates = name.indexOf("~") > -1,
						value = isDates ? data[name.split("~")[0]] : data[name],
						value2 = isDates ? data[name.split("~")[1]] : "";
					name = isDates ? name.split("~")[0] : name;
					if (value) {
						var operator = input.data("op") ? input.data("op") : "Contains",
							filter = new Filter(name, operator, value, value2);
						filters.push(filter);
					}
					if (name === "PastTrip" && value) {
						filters.push(new Filter("DateEnd", "LT", new Date()));
					}
				}
			});
			if(uname){
				filters.push(new Filter("Uname", "EQ", uname));
			}
			binding.filter(filters);
		},

		onCountryChange: function(e) {
			var addKey = e.getSource().getSelectedItem().getAdditionalText(),
				operator = addKey ? "EQ" : "NE",
				cb = e.getSource();
			cb.data("op", operator);
		},

		onSearchOriginal: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");
				if (sQuery && sQuery.length > 0) {
					var path = isNaN(sQuery) ? "Surname" : "Reinr";
					aTableSearchState = [new Filter(path, FilterOperator.Contains, sQuery)];
				}
				this._applySearch(aTableSearchState);
			}
		},

		onRefresh: function() {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		_applySearch: function(aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("rows").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},

		onCreateRequest: function(e) {
			if (e.getSource().data("nav")) {
				this.getRouter().navTo("create");
			} else {
				this.openDialog(e);
			}
		},

		showCities: function(oEvent) {
			var oCtx = oEvent.getSource().getBindingContext(),
				oControl = oEvent.getSource();

			// create popover
			if (!this.citiesPopup) {
				this.citiesPopup = sap.ui.xmlfragment("fragment.dialog.cities", this);
				this.getView().addDependent(this.citiesPopup);
				this.citiesPopup.attachAfterOpen(function() {
					this.disablePointerEvents();
				}, this);
				this.citiesPopup.attachAfterClose(function() {
					this.enablePointerEvents();
				}, this);
				this.citiesPopup.bindElement(oCtx.getPath());
				this.citiesPopup.openBy(oControl);
			} else {
				this.citiesPopup.bindElement(oCtx.getPath());
				this.citiesPopup.openBy(oControl);
			}
		},

		disablePointerEvents: function() {
			this.byId("table").getDomRef().style["pointer-events"] = "none";
		},

		enablePointerEvents: function() {
			this.byId("table").getDomRef().style["pointer-events"] = "auto";
		},

		handleActionPress: function() {
			this.citiesPopup.close();
		},

		onDelegateSelect: function(e) {
			var data = e.getParameter("listItem").getBindingContext().getObject();
			var delegateButton = sap.ui.getCore().byId("delegateDialogButton");
			delegateButton.data("uname", data.Uname).data("fio", data.Fio).setEnabled(true);
		},

		doDelegate: function(e) {
			var button = e.getSource(),
				uname = button.data("uname"),
				fio = button.data("fio"),
				table = this.byId("table");
			this.getModel("mock").setProperty("/delegUname", uname);
			var filter = [new Filter("Uname", "EQ", uname)];
			table.getBinding("items").filter(filter);
			MessageToast.show(this.getResourceBundle().getText("delegOn", fio));
			this.cancelDialog("delegateDialog");
		},

		onCancelDeleg: function(e) {
			this.byId("table").getBinding("items").filter([]);
			this.getModel("mock").setProperty("/delegUname", "");
			MessageToast.show(this.getResourceBundle().getText("delegOff"));
		},

		onSelectionChange: function(e) {
			var items = e.getSource().getSelectedItems(),
				length = items.length,
				enabled = length ? true : false,
				reinrs = "",
				userPernr = this.getModel("worklistView").getProperty("/userPernr");
			items.forEach(function(item) {
				var data = item.getBindingContext().getObject();
				reinrs = reinrs + data.Reinr + ",";
				// url = url + "/sap/opu/odata/sap/ZHR_FI_TV_REQ_SRV/ListApproveSet(Pernr='" + data.Pernr + "',Reinr='" + data.Reinr +
				// 	"',Type='')/$value~";
			}, this);
			reinrs = reinrs.slice(0, -1);
			var url = "/sap/opu/odata/sap/ZHR_FI_TV_REQ_SRV/ReestrNoteSet(Pernr='" + userPernr + "',Reinr='" + reinrs + "')/$value",
				url2 = "/sap/opu/odata/sap/ZHR_FI_TV_REQ_SRV/DecNoteSet(Filename='1',Reinr='" + reinrs + "')/$value";
			//this.donwloadLinks = url; // in case if data("url") is modified
			this.byId("massDownloadButton").data("url", url).data("url2", url2).setEnabled(enabled);
			this.byId("massApproveButton").setEnabled(enabled);
		},

		onAskDownload: function(e) {
			var i18n = this.getResourceBundle(),
				//button = e.getSource(),
				askText = i18n.getText("askDownload"),
				reestr = i18n.getText("reestr"),
				declaration = i18n.getText("declaration"),
				that = this;
			//button.data("url", this.donwloadLinks); // always keep last urls only
			MessageBox.confirm(askText, {
				styleClass: "wideBox",
				actions: [reestr, declaration, sap.m.MessageBox.Action.CLOSE],
				onClose: function(sAction) {
					if (sAction === reestr) {
						that.onDownload("massDownloadButton");
					} else if (sAction === declaration) {
						// var urlArr = button.data("url").split("~"),
						// 	lastUrl = urlArr[urlArr.length - 1];
						// button.data("url", lastUrl); // change button url as last
						that.onDownload("massDownloadButton", "url2");
					} else {
						MessageToast.show(i18n.getText("actionCancel"));
					}
				}
			});
		},

		onMassApprove: function(e) {
			var table = this.byId("table"),
				items = table.getSelectedItems(),
				button = e.getSource(),
				isSubmit = button.data("isSubmit"),
				i18n = this.getResourceBundle(),
				model = this.getModel(),
				delegate = this.getModel("mock").getProperty("/delegUname"),
				askText = isSubmit ? i18n.getText("askSubmit") : i18n.getText("askApprove"),
				text = isSubmit ? i18n.getText("submit") : i18n.getText("approve"),
				successText = isSubmit ? i18n.getText("submitSuccess") : i18n.getText("approveSuccess");
			MessageBox.confirm(askText, {
				actions: [text, sap.m.MessageBox.Action.CLOSE],
				onClose: function(sAction) {
					if (sAction === text) {
						var reqs = "";
						items.forEach(function(i) {
							var data = i.getBindingContext().getObject();
							reqs = reqs + data.Pernr + "," + data.Reinr + ";";
						});
						var parameters = {
							REQID: reqs.slice(0, -1),
							DELEGATE: "",
							AppId: "APP"
						};
						if (delegate) {
							parameters.DELEGATE = delegate;
						}
						if (reqs.slice(0, -1)) {
							model.callFunction("/MultipleApprove", {
								method: "GET",
								urlParameters: parameters,
								success: function() {
									table.getBinding("items").refresh(true);
									button.setEnabled(false);
									MessageToast.show(successText);
								}
							});
						}
					} else {
						MessageToast.show(i18n.getText("actionCancel"));
					}
				}
			});
		},

		onTableDataReceived: function(e) {
			// if (e && e.getSource() && e.getSource().getBinding("items")) {
			// 	var itemData = e.getSource().getBinding("items").getContexts()[0].getObject();
			// 	var i18n = this.getResourceBundle();
			// 	var isSubmit = itemData.Status1 === "1" && itemData.Status2 === "05";
			// 	var text = isSubmit ? i18n.getText("submit") : i18n.getText("approve");
			// 	this.byId("massApproveButton").setText(text).data("isSubmit", isSubmit);
			// }
			this.onUpdateFinished(e);
		},

		onTake: function(e) {
			var binding = this.byId("table").getBinding("items");
			var data = e.getSource().getParent().getBindingContext().getObject();
			var model = this.getModel();
			var router = this.getRouter();
			var text = this.getResourceBundle().getText("takenOn");
			model.callFunction("/Reserve", {
				method: "GET",
				urlParameters: {
					Pernr: data.Pernr,
					Reinr: data.Reinr,
					Message: "",
					Status: "8",
					AppId: "APP"
				},
				success: function() {
					binding.refresh(true);
					MessageToast.show(text, {
						onClose: function() {
							router.navTo("object", {
								Pernr: data.Pernr,
								Reinr: data.Reinr
							});
						}
					});
				}
			});
		},

		onSelectAll: function(e) {
			var checkBox = e.getSource(),
				i18n = this.getResourceBundle(),
				text = checkBox.getSelected() ? i18n.getText("allRequests") : i18n.getText("myRequests");
			checkBox.setText(text);
		},

		onPopOver: function(oEvent) {
			var oButton = oEvent.getSource();
			// create popover
			if (!this.popover) {
				this.popover = sap.ui.xmlfragment("fragment.dialog.advPaymentPopup", this);
				this.getView().addDependent(this.popover);
				this.popover.openBy(oButton);
			} else {
				this.popover.openBy(oButton);
			}
		}
	});
});