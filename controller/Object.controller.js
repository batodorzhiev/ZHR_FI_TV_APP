/*global location*/
sap.ui.define([
	"ZHR_FI_TV_APP/ZHR_FI_TV_APP/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"ZHR_FI_TV_APP/ZHR_FI_TV_APP/model/formatter",
	"sap/ui/model/Filter",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function(BaseController, JSONModel, History, formatter, Filter, MessageBox, MessageToast) {
	"use strict";

	return BaseController.extend("ZHR_FI_TV_APP.ZHR_FI_TV_APP.controller.Object", {

		formatter: formatter,

		onInit: function() {
			var iOriginalBusyDelay,
				oViewModel = new JSONModel({
					busy: true,
					delay: 0
				});
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.setModel(oViewModel, "objectView");
			this.getOwnerComponent().getModel().metadataLoaded().then(function() {
				// Restore original busy indicator delay for the object view
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			// Scroll to last item in timeline
			this.byId("timeline").addEventDelegate({
				onAfterRendering: function(e) {
					var items = e.srcControl.getContent();
					if (items.length > 0) {
						items[items.length - 1].focus();
						$(".sapMPageEnableScrolling").scrollTop(0);
					}
				}
			}, this);
		},

		_onObjectMatched: function(oEvent) {
			this.args = oEvent.getParameter("arguments");
			this.getModel().metadataLoaded().then(function() {
				this.getModel("objectView").setProperty("/busy", true);
				var sObjectPath = this.getModel().createKey("/RequestSet", {
					Reinr: this.args.Reinr,
					Pernr: this.args.Pernr
				});
				this._bindView(sObjectPath);
			}.bind(this));
		},

		_bindView: function(sObjectPath) {
			this.getModel().setSizeLimit(1000);

			var parameters = {
				expand: "ToTrips",
				custom: {
					AppID: "APP",
					Delegate: this._getDelegateUname()
				}
			};

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this)
				},
				parameters: parameters
			});
			// check if this object already loaded
			var busy = this.getView().getBindingContext() && this.getView().getBindingContext().getPath() === sObjectPath ? false : true;
			this.getModel("objectView").setProperty("/busy", busy);
			delete this.updateOnce;
		},

		_getDelegateUname: function() {
			var userid = sap.ushell.Container.getService("UserInfo").getId();

			// передача параметра из worklist
			var sDelegate = this.getModel("mock").getProperty("/delegUname");

			// передача параметра из письма по ссылке
			if (this.args.Delegate && userid !== this.args.Delegate) {

				this.getModel("mock").setProperty("/delegUname", this.args.Delegate);
				sDelegate = this.args.Delegate;
			}

			return sDelegate;
		},

		_onBindingChange: function() {
			var oView = this.getView(),
				oViewModel = this.getModel("objectView"),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("objectNotFound");
				return;
			}
			var obj = oView.getBindingContext().getObject();
			// Add the object page to the flp routing history
			this.addHistoryEntry({
				title: this.getResourceBundle().getText("objectTitle") + " - № " + obj.Reinr,
				icon: "sap-icon://enter-more",
				intent: "#ZHR_FI_TV_REQ-display&/RequestSet/" + obj.Reinr + "/" + obj.Pernr
			});
			this.byId("EmployeesSet").getBinding("suggestionItems").filter(new Filter("Pernr", sap.ui.model.FilterOperator.EQ, obj.Pernr));

			var appModel = this.getModel("appView");
			appModel.setProperty("/isCreate", false);
			appModel.setProperty("/isTripsEnabled", true);
			this.data = obj; // save all binded data

			var tripsLength = this.byId("tripsLength").getText();
			oViewModel.setProperty("/tripsLength", tripsLength);
		},

		onUpdateFinished: function(oEvent) {
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("trips", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("trip");
			}
			this.getModel("appView").setProperty("/tripsTitle", sTitle);
		},

		onTransLoaded: function(e) {
			if (!this.updateOnce) {
				this.getModel("objectView").setProperty("/busy", false);
				this.updateOnce = true;
			}
		},

		onChangeStatus: function(e) {
			var model = this.getModel(),
				button = e.getSource(),
				path = button.data("path"),
				comment = "",
				dialogId = button.data("id");
			if (dialogId === "submitDialog" && button.getId() === "addJustification") {
				comment = dialogId ? sap.ui.getCore().byId("submitCommentary").getValue() : "";
				if (comment.length === 0) {
					MessageBox.error("Обоснование не введено. Введите для отправки или выберите функцию «Пропустить обоснование»");
					return;
				}
			} else if (dialogId === "rejectDialog") {
				comment = dialogId ? sap.ui.getCore().byId("declineCommentary").getValue() : "";
			}

			var uname = button.data("uname") ? button.data("uname") : "",
				reinr = this.args.Reinr,
				dialog,
				i18n = this.getResourceBundle(),
				reqText = this.data.Status1 === "4" ? "отчёт" : "заявку",
				statusText = this.data.Status2 === "05" ? i18n.getText("reqSubmitted") : i18n.getText("reqApproved"),
				askText = this.data.Status2 === "05" ? "утвердить" : "согласовать",
				parameters = {
					Reinr: reinr,
					Uname: uname,
					AppId: "APP",
					Comment: comment
				},
				viewModel = this.getModel("objectView"),
				router = this.getRouter();
			//чистим view от текста чтобы он не появился в других заявках в диалог окне	
			switch (dialogId) {
				case "rejectDialog":
					sap.ui.getCore().byId("declineCommentary").setValue("");
					break;
				case "submitDialog":
					sap.ui.getCore().byId("submitCommentary").setValue("");
					break;
				default:
					break;
			}
			//if (comment) {
			if (dialogId === "rejectDialog") {
				//parameters.Comment = comment;
				dialog = sap.ui.getCore().byId(dialogId);
				statusText = i18n.getText("reqDeclined");
				askText = "отклонить";
			}
			MessageBox.confirm(i18n.getText("ask", [askText, reqText]), {
				actions: [askText.charAt(0).toUpperCase() + askText.slice(1), sap.m.MessageBox.Action.CLOSE],
				onClose: function(sAction) {
					if (sAction === askText.charAt(0).toUpperCase() + askText.slice(1)) {
						viewModel.setProperty("/busy", true);
						model.callFunction(path, {
							method: 'GET',
							urlParameters: parameters,
							success: function() {
								MessageBox.show(statusText, {
									icon: MessageBox.Icon.INFORMATION,
									title: "Информация",
									onClose: function() {
										// model.refresh(true);
										router.navTo("worklist", {
											refresh: true
										});
									}
								});
								if (dialog) {
									dialog.close();
								}
								model.refresh(true);
								viewModel.setProperty("/busy", false);
							},
							error: function() {
								viewModel.setProperty("/busy", false);
							}
						});
					} else {
						MessageToast.show(i18n.getText("actionCancel"));
					}
				}
			});
		},
		checkTextAreaLength: function(e) {
			var textArea = e.getSource(),
				maxLength = textArea.getMaxLength(),
				value = textArea.getValue();
			if (value.length >= maxLength) {
				var newValue = value.substring(0, maxLength);
				textArea.setValue(newValue);
				textArea.setValueState("Warning").setValueStateText(this.getResourceBundle().getText("Максимальное количество символов", maxLength));
			} else {
				textArea.setValueState("Success");
			}
		},
		objectCheckLength: function(e) {
			var textarea = e.getSource();
			var value = e.getParameter("value");
			var buttonStringArray = textarea.data("checkButton").split(",");
			var length = Number(textarea.data("length"));
			var maxLength = Number(textarea.getMaxLength());
			var enabled = value && value.length >= length && value.length <= maxLength ? true : false;
			buttonStringArray.forEach(function(buttonString) {
				var button = this.byId(buttonString) ? this.byId(buttonString) : sap.ui.getCore().byId(buttonString);
				button.setEnabled(enabled);
			}, this);
			var textareaState = enabled ? "None" : "Warning";
			textarea.setValueState(textareaState).setValueStateText(textarea.getValueStateText());
		},

		formReq: function(e) {
			window.open("/sap/opu/odata/sap/ZHR_FI_TV_REQ_SRV/LoadOrder(Pernr='3137',Reinr='0000000428',Filename='1')/$value");
		},

		onFormSelect: function(e) {
			var item = e.getSource().getSelectedItem();
			if (item) {
				var url = item.data("url");
				if (url) {
					url.split("~").forEach(function(u) {
						window.open(u);
					});
				} else {
					MessageToast.show(this.getResourceBundle().getText("inDev"));
				}
			}
			e.getSource().setSelectedKey("");
		},

		onSuggest: function(e) {
			var input = e.getSource();
			var filterValue = e.getParameter("suggestValue");
			var filterName = input.data("filterName");
			var aFilters = [];
			if (filterValue) {
				if (!isNaN(filterValue) && input.data("filterKey")) {
					filterName = input.data("filterKey");
				}
				aFilters.push(new Filter(filterName, sap.ui.model.FilterOperator.Contains, filterValue));
			}
			input.getBinding("suggestionItems").filter(aFilters);
			if (input.data("filterKey")) {
				input.setBusy(true);
			}
		},

		// Event triggered after all fio(employees) data received 
		onInputDataRecieved: function(e) {
			var id = e.getSource().getPath().substr(1);
			var items = this.getFieldGroups(this.getView().getControlsByFieldGroupId(id));
			items.forEach(function(item) {
				item.setBusy(false);
			}, this);
		},

		onFioSelected: function(e) {
			var item = e.getParameter("selectedItem"),
				enabled = item && item.getKey() ? true : false,
				key = item && item.getKey() ? item.getKey() : null;
			sap.ui.getCore().byId("changeExecutorDialogButton").setEnabled(enabled).data("pernr", key);
		},

		onChangeExecutor: function(e) {
			var button = e.getSource(),
				model = this.getModel(),
				i18n = this.getResourceBundle(),
				text = i18n.getText("executorChanged"),
				reinr = button.data("reinr"),
				pernr = button.data("pernr"),
				viewModel = this.getModel("objectView");

			MessageBox.confirm(i18n.getText("askChangeExecutor"), {
				actions: [i18n.getText("change"), sap.m.MessageBox.Action.CLOSE],
				onClose: function(sAction) {
					if (sAction === i18n.getText("change")) {
						viewModel.setProperty("/busy", true);
						model.callFunction("/Reserve", {
							method: "GET",
							urlParameters: {
								Pernr: pernr,
								Reinr: reinr,
								Message: "",
								Status: "9",
								AppId: "APP"
							},
							success: function() {
								model.refresh(true);
								MessageToast.show(text);
								viewModel.setProperty("/busy", false);
							},
							error: function() {
								viewModel.setProperty("/busy", false);
							}
						});
					} else {
						MessageToast.show(i18n.getText("actionCancel"));
					}
				}
			});
		},

		onTake: function(e) {
			var button = e.getSource(),
				model = this.getModel(),
				i18n = this.getResourceBundle(),
				reinr = button.data("reinr"),
				pernr = button.data("pernr");
			MessageBox.confirm(i18n.getText("askTake"), {
				actions: [i18n.getText("take"), sap.m.MessageBox.Action.CLOSE],
				onClose: function(sAction) {
					if (sAction === i18n.getText("take")) {
						model.callFunction("/Reserve", {
							method: "GET",
							urlParameters: {
								Pernr: pernr,
								Reinr: reinr,
								Message: "",
								Status: "8",
								AppId: "APP"
							},
							success: function() {
								MessageToast.show(i18n.getText("takenOn"));
								model.refresh(true);
							}
						});
					} else {
						MessageToast.show(i18n.getText("actionCancel"));
					}
				}
			});
		},
	});

});