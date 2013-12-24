(function() {
  Rally.env.MockGlobal = {
    requires: ['Rally.auth.UserPermissions'],
    setupEnvironment: function(contextConfig, environmentCls) {
      if (!environmentCls) {
        environmentCls = Rally.env.Environment;
      }
      Rally.environment = new environmentCls({
        context: this.setupContext(contextConfig)
      });
      return Rally.env.IoProvider.setSecurityToken('this-is-a-dummy-token');
    },
    setupContext: function(config) {
      var context;
      context = _.extend(this.getDefaultContext(), config);
      return new Rally.env.Context(context);
    },
    getDefaultContext: function() {
      return {
        scope: {
          up: false,
          down: true,
          projectOid: 431439,
          project: {
            _ref: '/project/431439',
            Name: 'Project 1',
            ObjectID: 431439
          },
          workspace: {
            ObjectID: 10732,
            _ref: '/workspace/10732',
            _type: 'Workspace',
            Name: 'Workspace 1',
            WorkspaceConfiguration: {
              DateFormat: 'yyyy-MM-dd',
              DateTimeFormat: 'yyyy-MM-dd hh:mm:ss a',
              DragDropEnabled: true,
              DragDropRankingEnabled: true,
              WorkDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
              IterationEstimateUnitName: 'Points',
              ReleaseEstimateUnitName: 'Points',
              TaskUnitName: 'Hours'
            }
          }
        },
        user: this.getDefaultUser(),
        permissions: new Rally.auth.UserPermissions([
          {
            _ref: 'http://localhost:7001/slm/webservice/x/project/431439',
            Role: 'Editor',
            Workspace: '/workspace/10732'
          }, {
            _ref: 'http://localhost:7001/slm/webservice/x/project/431440',
            Role: 'Viewer',
            Workspace: '/workspace/10732'
          }, {
            _ref: 'http://localhost:7001/slm/webservice/x/project/431441',
            Role: 'Viewer',
            Workspace: '/workspace/2343'
          }
        ]),
        subscription: {
          MaximumProjects: -1,
          SubscriptionType: 'Enterprise',
          ProjectHierarchyEnabled: true,
          StoryHierarchyEnabled: true,
          StoryHierarchyType: 'Unlimited',
          Modules: []
        }
      };
    },
    getDefaultUser: function(config) {
      return new Rally.domain.User(_.extend({
        UserName: 'test user',
        DisplayString: 'test user',
        _ref: '/user/123',
        _refObjectName: 'test',
        ObjectID: 123,
        UserProfile: {
          _ref: '/userprofile/1234',
          ObjectID: 1234,
          WelcomePageHidden: true,
          DateFormat: 'yyyy-MM-dd',
          DateTimeFormat: 'yyyy-MM-dd hh:mm:ss a'
        }
      }, config));
    },
    setup: function(spec) {
      return this.setupEnvironment();
    }
  };

}).call(this);
