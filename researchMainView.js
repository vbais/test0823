define([
    'app'
    , 'backbone'
    , 'marionette'
    , 'Handlebars'
    , 'backgrid'
    , 'bootstrap'
    , 'typeahead'
    , 'accessRequest/research/views/researchConstants'
    , 'accessRequest/research/views/researchChannel'
    , 'accessRequest/research/views/researchGrid'
    //, 'accessRequest/research/views/templatesCache'
    , 'accessRequest/research/views/researchHeaderView'
    , 'accessRequest/research/views/projectInfoView'
    , 'accessRequest/research/models/projectInfoModel'
    , 'hbs!accessRequest/research/templates/dataSetsInfoTpl'
    , 'accessRequest/research/views/y14MainChildView'
    , 'accessRequest/research/views/dataStorageView'
    , 'accessRequest/research/models/dataStorageModel'
    , 'hbs!accessRequest/research/templates/coauthorsInfoTpl'
    , 'accessRequest/research/models/namsResModel'
    , 'hbs!accessRequest/research/templates/researchMainTpl'
], function (
    App
    , Backbone
    , Marionette
    , Handlebars
    , Backgrid
    , bootstrap
    , t
    , ResearchConstants
    , ResearchChannel
    , ResearchGrid
    //, TemplatesCache
    , ResearchHeaderView
    , ProjectInfoView
    , ProjectInfoModel
    , DataSetsTpl
    , Y14MainChildView
    , DataStorageView
    , DataStorageModel
    , CoAuthorsTpl
    , NamsResModel
    , ResearchMainTpl) 
{

    //var NamsResModel = Backbone.Model.extend({});
    var namsResModel = new NamsResModel();

    //-------------------------------------------------------------------------
    // Container View

    var ResearchMainView = Marionette.LayoutView.extend({
        template: ResearchMainTpl, //TemplatesCache.get('namsResTemplate'),

        models: {
            headerView: null,
            projectInfoModel: null,
            projectInfoView: null,
            dataStorageModel: null,
            dataStorageView: null
        },

        regions: {
            rgResHeader: '#headerRegion',
            rgResProjectInfo: '#projectInfoRegion',
            rgResDataSets: '#dataSetsInfoRegion',
            rgResDataStorage: '#dataStorageInfoRegion',
            rgResCoAuthorsSupportStaff: '#coauthorsInfoRegion'
        },

        initialize: function () {

            var formModeNode = App.request('getLookup', 'accessRequestFormMode');
            this.models.formMode = formModeNode.get('mode');  

        },

        onRender: function () {
            this.models.headerView = new ResearchHeaderView();
            this.rgResHeader.show(this.models.headerView);

            this.models.projectInfoModel = new ProjectInfoModel();
            this.models.projectInfoView = new ProjectInfoView({ model: this.models.projectInfoModel });

            this.rgResProjectInfo.show(this.models.projectInfoView);

            this.rgResDataSets.show(new ResRequestedDataSetView());

            this.models.dataStorageModel = new DataStorageModel();
            this.models.dataStorageView = new DataStorageView({ model: this.models.dataStorageModel });
            this.rgResDataStorage.show(this.models.dataStorageView);

            this.rgResCoAuthorsSupportStaff.show(new ResCoAuthorsSupportStaffView());
        },

        //el: '#appCommonHeaderRegion',

        events: {
            'click #btnSubmit': function () {
                ResearchChannel.trigger('researchMainView:submit:click', namsResModel);

                var projectInfoError = this.models.projectInfoView.commit();
                if (projectInfoError != undefined) {
                    console.log('Error(s) in Project Info section ', projectInfoError);
                    return;
                }
                // NIC LT approach
                //var projectTitle = this.models.projectInfoModel.get('RschProjectTitleFld');
                // Research approach
                var projectInfo = ResearchChannel.request('modelData:projectInfo:get');
                console.log('Project Information section data ', projectInfo);

                var url1 = App.request('getEndpoint', 'accessRequest-endpoint');

                namsResModel.save(
                    { id: null, isDraft: false }, 
                    {
                        url: url1,
                        success: function (model) {
                            console.log('request data submitted');
                        },
                        error: function (model) {
                            console.log('error submitting request data');
                        }
                    }
                );
            },
            'click .save-button': function () {

                var projectInfoError = this.models.projectInfoView.commit();
                if (projectInfoError != undefined) {
                    console.log('Error(s) in Project Info section ', projectInfoError);
                    return;
                }

                var dataStorageError = this.models.dataStorageView.commit();
                if (dataStorageError != undefined) {
                    console.log('Error(s) in Data Storage section ', dataStorageError);
                    return;
                }

                namsResModel.set('RepoName', 'Research');
                namsResModel.set('Status', 'Draft');

                // ToDo: move this to projectInfoView (model after researchHeaderView)
                var projectInfo = {
                    Title: this.models.projectInfoModel.get('RschProjectTitleFld'),
                    ResearchType: this.models.projectInfoModel.get('RschType'),
                    Justification: this.models.projectInfoModel.get('RschProjectDescriptionFld')
                };
                namsResModel.set('projectInfo', projectInfo);

                // ToDo: move this to dataStorageView (model after researchHeaderView)
                var dataStorageInfo = {
                    AccessDuration: this.models.dataStorageModel.get('RschAccessDurationData'),
                    StorageLocation: this.models.dataStorageModel.get('RschStorageLocationData'),
                    StorageDescription: this.models.dataStorageModel.get('RschStorageDescriptionData')
                };
                namsResModel.set('dataStorageInfo', dataStorageInfo);

                // get information from 4 grids
                ResearchChannel.trigger('researchMainView:submit:click', namsResModel);

                // Submit the request
                namsResModel.url = App.request('getEndpoint', 'accessRequest-endpoint');
                namsResModel.save();
            }
        }
    });


    //-------------------------------------------------------------------------
    // 0. Header views
    
    //var ResHeaderView = Marionette.LayoutView.extend({
	//	template: TemplatesCache.get('resHeaderTemplate'),
	//	render: function () {
	//		this.$el.html(this.template());
	//		// this.childView = new SimpleViewTest({ model: simpleViewModel });
	//		// this.childView.render();
    //		// ResearchChannel.trigger('testEvent:fired', 'Event Data');
	//		return (this);
	//	}

	//});

	//var ResRequestersEndorsersView = Marionette.LayoutView.extend({
	//	template: TemplatesCache.get('resRequestersEndorsersTemplate'),
	//	render: function () {
	//		this.$el.html(this.template());
	//		// simpleViewModel.set('display', 'replaced text 2');
	//		return (this);
	//	}
	//});

    //-------------------------------------------------------------------------
    // 1. Project Info view
    
	//var ResProjectInfoView = Marionette.LayoutView.extend({
	//	template: TemplatesCache.get('resProjectInfoTemplate')
	//});

	//-------------------------------------------------------------------------
	// 2. Requested Data and Storage view

    //Model		
    var FrsDatasets = Backbone.Collection.extend({});
    var frsDatasets = new FrsDatasets();
    var frsDDOptions = {
        id: 0,
        displayText: '--Select--'
    };;
    ResearchChannel.on('requestLoad:success', function (namsResData) {
        var reqData = namsResData.get('assets');
        var lzDatasets = reqData ? reqData.frsDatasets : [{}];
        frsDatasets.reset(lzDatasets);
    });
    ResearchChannel.on('repositoryLoad:success', function (namsResData) {
        frsDDOptions = namsResData.get('assets');
    });

    var FrsDatasetDropDownCell = Backgrid.Cell.extend({
        //id:'',
        initialize: function () { // for FrsDatasetDropDownCell
            FrsDatasetDropDownCell.__super__.initialize.apply(this, arguments);
            this.column.currentModel = this.model;
            this.column.datasetType = ''; //dtcc or y14 or else
            //this.model.set('datasetId', 0, { silent: true }); //silent:true disables rerender when model changes.
            var it = this;
            this.column.set('dropDownOptions', ResearchChannel.request('datasets:getDisplayText'));
            ResearchChannel.reply('cancel:clicked:command', function () {
                it.column.currentModel.destroy();
                if (it.column.datasetType === 'dtcc') {
                    ResearchChannel.trigger('dtcc:remove'); 
                } else if (it.column.datasetType === 'y14') {
                    y14SchedulesGrid.clearSelectedModels();
                }
            });
            ResearchChannel.reply('submit:clicked:command', function () {
                if (it.column.datasetType === 'dtcc') {
                    console.log('Submitter agreed to DTCC policy');
                } else if (it.column.datasetType === 'y14') {
                    //var selectedModels = y14SchedulesGrid.getSelectedModels();
                    var selectedModels = ResearchChannel.request('y14Schedules:selected');
                    var schedules = _.map(selectedModels, function (selectedModel) {
                        return (selectedModel.get('schedule') + ' - ' + selectedModel.get('description'));
                    }).join('</br>');
                    it.column.currentModel.set('y14Schedules', schedules);
                    //var selectedResearchType = ResearchChannel.request('selectedResearchType:get');
                    var selectedResearchType = ResearchChannel.request('y14ResearchType:selected');  
                    var schedulesIdArray = _.map(selectedModels, function (selectedModel) {
                        return ({
                            id: selectedModel.get('id')
                        });
                    });
                    //if (selectedResearchType && schedulesIdArray.length > 0) {
                    if (schedulesIdArray.length > 0) {
                        it.column.currentModel.set('y14ResearchTypes', selectedResearchType.displayText);
                        var y14Data = {
                            y14ResearchTypes: { id: selectedResearchType ? selectedResearchType.id : 0 },
                            y14Schedules: schedulesIdArray
                        };
                        it.column.currentModel.set('y14Data', y14Data);
                    }
                    _.defer(function () {
                        y14SchedulesGrid.clearSelectedModels();
                    });
                }
            });
        },

        render: function () { // for FrsDatasetDropDownCell
            var guId = ResearchGrid.guId();
            var it = this;
            this.$el.html(this.template(
                {
                    data: this.column.get('dropDownOptions'),
                    id: guId
                }));
            var datasetId = this.model.get('datasetId') || 0;
            $('#' + guId).val(datasetId);

            _.defer(function () {
                $('#' + guId).val(datasetId);
            });

            //populate other columns of grid
            if (datasetId) {
                var selectedObject = ResearchChannel.request('dataset:getSelectedObject', datasetId);
                if (datasetId / 1 != 0) {
                    // ToDo: when is this called? Same thing is done in events->change method of FrsDropDownCell
                    this.model.set('owners', selectedObject.owners.join('</br>'));
                    this.model.set('classification', selectedObject.dataClassification);
                    this.model.set('dataClassification', selectedObject.dataClassification);
                    if (selectedObject.displayText === ResearchConstants.y14) {
                        var y14ResearchTypesId = this.model.get('y14Data').y14ResearchTypes.id;
                        var y14ResearchTypesDisplayText = ResearchChannel.request('y14ResearchType:getDisplayText', y14ResearchTypesId);
                        this.model.set('y14ResearchTypes', y14ResearchTypesDisplayText);
                        var y14SchedulesArray = this.model.get('y14Data').y14Schedules;
                        var y14Schedules = _.map(y14SchedulesArray, function (y14Schedule) {
                            var y14ScheduleObject = ResearchChannel.request('y14Schedule:getScheduleObject', y14Schedule.id);
                            //return (scheduleObject.get('schedule') + ' - ' + selectedModel.get('description'));
                        }).join('</br>');
                    }
                }
            }
            this.delegateEvents();
            return this;
        },

        isDtccExist: function () { // for FrsDatasetDropDownCell
            var dtccId = 0;
            var ret = false;
            var dtcc = this.column.get('dropDownOptions').find(function (d) {
                return (d.displayText === ResearchConstants.dtccSwap)
            });
            if (dtcc) {
                dtccId = dtcc.id;
            } else {
                console.log('Dtcc swap spelling mismatch');
                //return;
            }
            //find out if any row in dataset has dtcc swap selected from drop downlist				
            var isExist = this.model.collection.find(function (d) {
                return (d.get('datasetId') / 1 === dtccId);
            });
            if (isExist && (dtccId > 0)) {
                ret = true;
            }
            return (ret);
        },

        events: { // for FrsDatasetDropDownCell
            change: function (e) {
                var selectedValue = $(e.target).val();
                var selectedText = $(e.target).find('option:selected').text().trim();

                //prevent rows having same datasetId (duplicate rows)					
					
                var isExists = this.model.collection.any(function(item){
                    return(item.get('datasetId')/1 === selectedValue/1); //to convert to integer
                });					
                if (isExists) {
                    this.model.destroy();
                    return;
                }
                var columnName = this.column.get('name');
                this.model.set(columnName, selectedValue, { silent: true }); //silent:true disables rerender when model changes.										

                this.model.set('owners', null);
                this.model.set('dataClassification', null);
                this.model.set('y14ResearchTypes', null);
                this.model.set('y14Schedules', null);
                this.model.set('y14Data', null);
                this.column.currentModel = this.model;

                var selectedObject = ResearchChannel.request('dataset:getSelectedObject', selectedValue);
                if (selectedValue / 1 != 0) {
                    this.model.set('owners', selectedObject.owners.join('</br>'));
                    this.model.set('classification', selectedObject.dataClassification);
                    this.model.set('dataClassification', selectedObject.dataClassification);
                }
                if (selectedText === ResearchConstants.dtccSwap) {
                    this.column.datasetType = 'dtcc';
                    ResearchChannel.trigger('dtcc:add');
                    console.log("DTCC data set added to grid");
                    var namsModal = new ResearchGrid.NamsModal({
                        childView: new DtccDataPolicyChildView()
                    });
                    namsModal.render();
                    $('#namsModal').modal();
                } else {
                    //if dtcc swap does not exist in any of the rows then remove 'DTCC data policy' column from other grids.
                    if (!this.isDtccExist()) {
                        console.log("No DTCC data set found in grid");
                        ResearchChannel.trigger('dtcc:remove');
                    }
                    if (selectedText === ResearchConstants.y14) {
                        this.column.datasetType = 'y14';
                        var namsModal = new ResearchGrid.NamsModal({
                            childView: new Y14MainChildView(),
                            modalHeader: ResearchConstants.y14ModalCaption
                        });
                        namsModal.render();
                        $('#namsModal').modal();
                        ResearchChannel.trigger('y14Modal:fired'); // to load schedules
                    }
                } 
            }
        },

        template: Handlebars.compile(`
            <select name='frsDatasetOptions' id='{{id}}'>
                {{#each data}}
                    <option value='{{this.id}}'>{{this.displayText}} </option> 
                {{/each}}
            </select>				
        `)
    });

    var FrsDatasetDeleteCell = ResearchGrid.DeleteCell.extend({
        beforeDelete: function (coll) {
            var dtccId = 0;
            var datasets = ResearchChannel.request('datasets:get');
            var dtccDataset = _.findWhere(datasets, { displayText: ResearchConstants.dtccSwap });
            if (dtccDataset) {
                dtccId = dtccDataset.id;
            } else {
                return;
            }
            if (this.model.get('datasetId') / 1 === dtccId) {
                ResearchChannel.trigger('dtcc:remove');
            };
        }
    });

    var frsDatasetColumns =
        [{ name: "datasetId", label: "Data Set", cell: FrsDatasetDropDownCell, sortable: "false" },
            { name: "owners", sortable: false, label: "Owners", editable: "false", cell: "html", sortable: "false" },
            { name: "classification", label: "Classification", editable: "false", cell: "html", sortable: "false" },
            { name: "y14ResearchTypes", label: "Y-14 Research Types", editable: "false", cell: "html", sortable: "false" },
            { name: "y14Schedules", label: "Y-14 Schedules", editable: "false", cell: "html", sortable: "false" },
            { name: "delete", label: "Delete", cell: FrsDatasetDeleteCell, sortable: "false" },
            { name: "y14Data", label: "y14Data", editable: "false", cell: "string", sortable: "false" }
        ];

    var ResRequestedDataSetView = Marionette.LayoutView.extend({
        template:  DataSetsTpl, //TemplatesCache.get('resRequestedDataStorageTemplate'),
        regions: {
            rgFrsDatasets: '#frsDatasets'
        },
        onRender: function () {
            frsDatasetsGrid = new ResearchGrid.Grid({
                className: 'author table table-striped',
                columns: frsDatasetColumns,
                collection: frsDatasets,
                footer: ResearchGrid.AddRowFooter,
                addLabel: 'Add Data Set',
                emptyText: 'No Data'
            });
            this.rgFrsDatasets.show(frsDatasetsGrid);
        }
    });

    var DtccDataPolicyChildView = Backbone.View.extend(
        {
            template: Handlebars.compile(`
                    <div>
                        <div>{{dtccDataPolicy}}</div>
                    </div>					
                `),
            render: function () {
                this.$el.html(this.template({ dtccDataPolicy: ResearchConstants.dtccDataPolicy }));
            }
        }
    );

    var Y14ChildView = Backbone.View.extend({
        template: function () {
            var template =
                `				
                <div>Research Types</div>
                <div id='namsY14ResearchTypes'></div>
                <div>Schedules</div>
                <div id='namsY14SchedulesGrid'></div>
            `;
            return (template);
        },
        render: function () {
            this.$el.html(this.template());
            this.childView1 = new Y14ResearchTypes({});
            this.childView1.setElement(this.$el.find('#namsY14ResearchTypes'));
            this.childView1.render();
            this.childView1.delegateEvents();

            this.childView2 = y14SchedulesGrid;
            this.childView2.setElement(this.$el.find('#namsY14SchedulesGrid'));
            this.childView2.render();
            this.childView2.delegateEvents();
            return (this);
        }
    });

    var Y14ResearchTypes = Backbone.View.extend({
        template: Handlebars.compile(
            `					
                {{#each researchTypes}}
                    <input type="radio" name="researchTypes" data-displayText='{{this.displayText}}' class="y14ResearchTypes" value="{{this.id}}">{{this.displayText}}<br>
                {{/each}}
            `
        ),
        render: function () {
            var researchTypes = ResearchChannel.request('y14ResearchTypes:get');
            this.$el.html(this.template({ researchTypes: researchTypes }));
        },
        events: {
            'change input[type=radio]': function (e) {
                e.stopPropagation();
                this.selectedResearchType = $(e.target).val();
                ResearchChannel.reply('selectedResearchType:get', function () {
                    var selectedResearchType = {
                        id: $(e.target).val(),
                        displayText: $(e.target).attr('data-displayText')
                    };
                    return (selectedResearchType);
                })
            }
        }
    });

    var Y14SchedulesColumns = [{ name: "", cell: ResearchGrid.SelectCell, headerCell: "select-all" }, { name: "fry14", label: "FRY-14", editable: "false", cell: "string" }, { name: "schedule", label: "Schedule", editable: "false", cell: "string" }, { name: "description", label: "Description", editable: "false", cell: "string" }];

    var y14SchedulesCollection = new Backbone.Collection();
    ResearchChannel.on('y14Modal:fired', function () {
        y14SchedulesCollection.add(ResearchChannel.request('y14Schedules:get'));
    });

    var y14SchedulesGrid = new ResearchGrid.Grid({
        className: 'author table table-striped',
        row: ResearchGrid.SelectableRow,
        columns: Y14SchedulesColumns,
        collection: y14SchedulesCollection,
        footer: ResearchGrid.SelectCountFooter,
        emptyText: 'No Data'
    });



    //-------------------------------------------------------------------------		
    // 3. Co-Authors and support staff

		var ResCoAuthorsSupportStaffView = Marionette.LayoutView.extend({
		    template: CoAuthorsTpl, //TemplatesCache.get('resCoAuthorsSupportStaffTemplate'),
			regions: {
				rgFrsCoAuthors: '#frsCoAuthors',
				rgFrsAnalysts: '#frsAnalysts',
				rgNonFrsCoAuthors: '#nonFrsCoAuthors'
			},
			onRender: function () {
				this.rgFrsCoAuthors.show(frsCoAuthorsGrid);
				this.rgFrsAnalysts.show(frsAnalystsGrid);
				this.rgNonFrsCoAuthors.show(nonFrsCoAuthorsGrid);
			}
		});

		//Model

		var FrsCoAuthors = Backbone.Collection.extend({});
		var FrsAnalysts = Backbone.Collection.extend({});
		var NonFrsCoAuthors = Backbone.Collection.extend({});

		var frsCoAuthors = new FrsCoAuthors();
		var frsAnalysts = new FrsAnalysts();
		var nonFrsCoAuthors = new NonFrsCoAuthors();

		ResearchChannel.on('researchMainView:submit:click', function (namsResModel) {

		    //var gridCol = frsDatasetsGrid.collection;
		    //frsDatasets.reset(gridCol);

			frsDatasets = _.map(frsDatasets.toJSON(), function (item) {
				return ({
					id: item.datasetId,
					y14Data: item.y14Data
		        });
		    });

			frsCoAuthors = _.map(frsCoAuthors.toJSON(), function (item) {
				return ({
					loginName: item.loginName
		        });
			});

			frsAnalysts = _.map(frsAnalysts.toJSON(), function (item) {
				return ({
					loginName: item.loginName
				});
			});

			nonFrsCoAuthors = _.map(nonFrsCoAuthors.toJSON(), function (item) {
				return ({
					name: item.Name,
					affiliation: item.affiliation,
					email: item.email
				});
			});

			namsResModel.set('frsDatasets', frsDatasets);
			namsResModel.set('frsCoAuthors', frsCoAuthors);
			namsResModel.set('frsAnalysts', frsAnalysts);
			namsResModel.set('nonFrsCoAuthors', nonFrsCoAuthors);
		});

		var frsCoAuthorColumns =
			[ //{ name: "loginName", label: "Login Name", editable: "false", cell: "string" },
				{ name: "name", label: "Name", editable: "false", cell: "string" },
				{ name: "termsOfUse", sortable: false, label: "Terms of Use", editable: "false", cell: "html", formatter: ResearchGrid.TermsOfUseFormatter },
				{ name: "csiEligibility", label: "CSI Eligibility", editable: "false", cell: "html", formatter: ResearchGrid.EligibilityFormatter },
				{ name: "delete", label: "Delete", cell: ResearchGrid.DeleteCell }
			];

		var frsAnalystColumns =
			[ //{ name: "loginName", label: "Login Name", editable: "false", cell: "string" },
				{ name: "name", label: "Name", editable: "false", cell: "string" },
				{ name: "termsOfUse", label: "Terms of Use", editable: "false", cell: "html", formatter: ResearchGrid.TermsOfUseFormatter },
				{ name: "csiEligibility", label: "CSI Eligibility", editable: "false", cell: "html", formatter: ResearchGrid.EligibilityFormatter },
				{ name: "delete", label: "Delete", cell: ResearchGrid.DeleteCell }
			];

		var nonFrsCoAuthorColumns =
			[ { name: "name", label: "First and Last Name", cell: ResearchGrid.EditCell },
				{ name: "affiliation", label: "Affiliation", cell: ResearchGrid.EditCell },
				{ name: "email", label: "Email", cell: ResearchGrid.EditCell },
				{ name: "delete", label: "Delete", cell: ResearchGrid.DeleteCell }
			];

		ResearchChannel.on('frsCoAuthors:populated', function (coAuthorsFunc) {
			var coAuthors = coAuthorsFunc();
			if (coAuthors) {
				frsCoAuthors.reset(coAuthors);
			}
		});

		ResearchChannel.on('frsAnalysts:populated', function (analystsFunc) {
			var analysts = analystsFunc();
			if (analysts) {
				frsAnalysts.reset(analysts);
			}
		});

		ResearchChannel.on('nonFrsCoAuthors:populated', function (nfCoAuthorsFunc) {
			var nfCoAuthors = nfCoAuthorsFunc();
			if (nfCoAuthors) {
				nonFrsCoAuthors.reset(nfCoAuthors);
			}
		});

		var frsCoAuthorsGrid = new ResearchGrid.Grid({
		    className: 'author table table-striped',
			columns: frsCoAuthorColumns,
			collection: frsCoAuthors,
			footer: ResearchGrid.ADSearchFooter,
			emptyText: 'No Data',
			addLabel: ResearchConstants.addFrsCoAuthors,
			adSearchConfig: {
			    url: '/author/%QUERY',
//			    url: '/api/userProfile/searchextended?domain=RB&isWildCardOn=true&searchTerm=%QUERY',
				searchFieldName: 'name',
				outputFieldNames: ['loginName', 'name', 'termsOfUse', 'csiEligibility', 'dtccDataPolicy']
			}
		});

		var frsAnalystsGrid = new ResearchGrid.Grid({
		    className: 'author table table-striped',
			columns: frsAnalystColumns,
			collection: frsAnalysts,
			footer: ResearchGrid.ADSearchFooter,
			emptyText: 'No Data',
			addLabel: ResearchConstants.addFrsAnalysts,
			adSearchConfig: {
				url: '/analyst/%QUERY',
//			    url: '/api/userProfile/searchextended?domain=RB&isWildCardOn=true&searchTerm=%QUERY',
			    searchFieldName: 'name',
				outputFieldNames: ['loginName', 'name', 'termsOfUse', 'csiEligibility', 'dtccDataPolicy']
			}
		});

		var nonFrsCoAuthorsGrid = new ResearchGrid.Grid({
		    className: 'author table table-striped non-frs-table',
			columns: nonFrsCoAuthorColumns,
			collection: nonFrsCoAuthors,
			footer: ResearchGrid.AddRowFooter,
			addLabel: ResearchConstants.addNonFrsCoAuthor// 'Add Non-FRS Co-Author',			
		});

		//var formMode = App.request('getLookup', 'accessRequestFormMode');
		//if (this.models.formMode == ResearchConstants.newRequestStatusName) {  
		//    // For new form mode, call reset to trigger setADSearch() method in the AD footer of the first 2 grids in CoAuthors section
		//    frsCoAuthors.reset();
		//    frsAnalysts.reset();
		//    nonFrsCoAuthors.reset();
		//}

		return (ResearchMainView);
	});

/*
SSS:
*/