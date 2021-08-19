sap.ui.define([
	"ZHR_FI_TV_APP/ZHR_FI_TV_APP/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History"
], function(BaseController, JSONModel, History) {
	"use strict";

	return BaseController.extend("ZHR_FI_TV_APP.ZHR_FI_TV_APP.controller.App", {

		onInit: function() {
			var oViewModel,
				fnSetAppNotBusy,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay(),
				router = this.getRouter();

			oViewModel = new JSONModel({
				busy: true,
				delay: 0
			});
			this.setModel(oViewModel, "appView");

			fnSetAppNotBusy = function() {
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};

			// disable busy indication when the metadata is loaded and in case of errors
			this.getOwnerComponent().getModel().metadataLoaded().
			then(fnSetAppNotBusy);
			this.getOwnerComponent().getModel().attachMetadataFailed(fnSetAppNotBusy);

			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

			this.getOwnerComponent().getService("ShellUIService").then(function(oShellService) {
				oShellService.setBackNavigation(function() {
					var sPreviousHash = History.getInstance().getPreviousHash(),
						oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
					if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
						history.go(-1);
					} else {
						router.navTo("worklist", {}, true);
					}
				});
			});
		}
	});

});