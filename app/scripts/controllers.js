'use strict';

/* Controllers */
var scorm = pipwerks.SCORM;
var appControllers = angular.module('appControllers', []);

appControllers.controller('dataCtrl', ['$scope', '$filter', 'MenuFetch', 'CourseModel',
    function ($scope, $filter, MenuFetch, CourseModel) {
      //console.log('indexCtrl Hi');

      //init scorm;
      scorm.init();
      //console.log('scorm.isAvailable:' + scorm.isAvailable());
      //console.log('cmi.learner_name:' + scorm.get('cmi.learner_name'));
      //console.log('cmi.location:' + scorm.get('cmi.location'));
      $scope.courseModel = CourseModel;

      $scope.menuJson = MenuFetch.get({menuId: 'menuAll'}, function (menuJson) {
        var navigationSequence = function () {
          //console.log('--navigationSequence:');
          var navItemArray = [],
            addToNavSeq = function (pId, nLevel) {
              nLevel += 1;
              //console.log('-------------\naddToNavSeq:' + pId);
              var nodes;
              nodes = $filter('filter')(menuJson.navItems, {parentId: pId});

              //console.log('nodes antal:' + nodes.length);
              //sort according to attr "sortOrder"
              nodes.sort(function (a, b) {
                return (parseInt(a.sortOrder, 10) - parseInt(b.sortOrder, 10));
              });
              //do for each of these elements, now sorted by "sortOrder"
              for (var i = 0; i < nodes.length; i += 1) {
                //get attribute id
                var currentId = nodes[i].id;
                //console.log('score:' + nodes[i].weighting);
                nodes[i].navLevel = nLevel;
                navItemArray.push(nodes[i]);
                addToNavSeq(currentId, nLevel);

              }
              // return sequence;
            }
          addToNavSeq('0', -1);
          return navItemArray;
        };
        //calculate score_max
        angular.forEach($scope.menuJson.navItems, function (value, key) {
          CourseModel.score_max += value.weighting;
        });
        CourseModel.saveInitialScormData();
        //console.log('CourseModel.score_max:' + CourseModel.score_max);
        CourseModel.menuData.menuItems = navigationSequence();
        $scope.setSelectedItem = function (menuItem) {
          CourseModel.setSelectedItem(menuItem);
        };
        //console.log('seq IS DOMNE??' + CourseModel.menuData.menuItems[0].id);
        var selStartItem = (scorm.get('cmi.location') != "") ? CourseModel.getNavObjById(scorm.get('cmi.location')) : CourseModel.menuData.menuItems[0]
        CourseModel.setSelectedItem(selStartItem);

      });

      $scope.showNavItem = function (menuItem) {

        var returnVal = (CourseModel.menuData.ancestorsArray.indexOf(menuItem.id) > -1 ||
        CourseModel.menuData.ancestorsArray.indexOf(menuItem.parentId) > -1);
        //console.log(' showNavItem : ' + returnVal);
        return !returnVal;
      };

    }
  ]
);

appControllers.controller('mainCtrl', ['$scope', '$sce', 'CourseModel', 'SharedFunctions',
    function ($scope, $sce, CourseModel, SharedFunctions) {
      $scope.msg = 'xxx';
      //console.log('---mainCtrl Hi');
      $scope.courseModel = CourseModel;
      $scope.showFeedback = false;
      $scope.answersSelected = [];
      $scope.scormTestData;
      $scope.$watch('courseModel.currentQObject', function (newValue, oldValue) {
        //console.clear();
        CourseModel.enableEvalBtn = false;
        $scope.cObj = CourseModel.currentQObject;

        if ($scope.cObj !== null) {
          $scope.showFeedback = false;
          $scope.mText = $sce.trustAsHtml($scope.cObj.mainText);
          $scope.iaType = $scope.cObj.type;
          //console.log(": cmi id: " + CourseModel.getCurrentScormData("id"));
          //console.log(": cmi learner_response : " + CourseModel.getCurrentScormData("learner_response"));
          //console.log(": cmi result: " + CourseModel.getCurrentScormData("result"));
          //console.log(": iaType: " + $scope.iaType);
          $scope.answersSelected = CourseModel.getLearner_response();
          $scope.setFeedBack($scope.answersSelected);
          CourseModel.enableEvalBtn = false;
          CourseModel.setCurrentScormData("weighting", CourseModel.menuData.weighting);
          if ($scope.iaType === "type1") {
            CourseModel.setCurrentScormData("result", "correct");
            CourseModel.setCurrentScormData("score.raw", CourseModel.menuData.weighting);
          } else {
            var savedResult = CourseModel.getCurrentScormData("result");
            var cResult = (savedResult && savedResult!== 0 && savedResult!== "undefined")? savedResult:"unanticipated";
            CourseModel.setCurrentScormData("result", cResult);

          }
        }
        CourseModel.setScoreRaw();
        $scope.scormTestData = JSON.stringify(pipwerks.testData, null, "\t");
        //console.log("IA READY getLearner_response:" + CourseModel.getLearner_response());

        //

        //console.log('currentQObject CourseModel.enableEvalBtn:', CourseModel.enableEvalBtn);

      });
      $scope.$watch('answersSelected', function (newValue, oldValue) {
        $scope.currentResult = newValue;
      }, true);
      $scope.navigate = function (step) {
        CourseModel.navigate(step);

      };
      $scope.answClicked = function () {
        //console.log('answClicked answClicked')
        CourseModel.enableEvalBtn = true;
        $scope.showFeedback = false;
      };
      $scope.evaluate = function () {
        CourseModel.setCurrentScormData("learner_response", $scope.currentResult);
        var filteredArr = SharedFunctions.cleanArray($scope.answersSelected);
        var currentResult = (filteredArr.toString() === $scope.cObj.quiz.correct) ? "correct" : "incorrect";
        console.log("answers: " + filteredArr.toString() + " quiz.correct:" + $scope.cObj.quiz.correct.toString());
        console.log("currentResult: " + currentResult);
        CourseModel.setCurrentScormData("result", currentResult);
        console.log("get currentResult: " + CourseModel.getCurrentScormData("result"));
        var cScore = (currentResult === "correct") ? CourseModel.menuData.weighting : 0;
        CourseModel.setCurrentScormData("score.raw", cScore);
        $scope.setFeedBack($scope.answersSelected);
        CourseModel.enableEvalBtn = false;
        CourseModel.setScoreRaw();
      };
      $scope.isSelectedAnswer = function (index) {
        //console.log('isSelectedAnswer:' + index);
        return true;
      };
      $scope.setFeedBack = function (answArr) {
        //console.log('setFeedBack:' + answArr.toString());
        if (answArr.toString() !== "undefined") {
          var cleanedArrStr = SharedFunctions.cleanArray(answArr).toString();
          //console.log('setFeedBack - cleanedArrStr:' + cleanedArrStr);
          var currFeedbackText = $scope.cObj.quiz.feedback[cleanedArrStr];
          currFeedbackText = (currFeedbackText === undefined) ? $scope.cObj.quiz.feedback["-1"] : currFeedbackText;
          $scope.getFeedbacText = "[" + cleanedArrStr + "]:" + currFeedbackText;
          $scope.showFeedback = true;
        }
        $scope.scormTestData = JSON.stringify(pipwerks.testData, null, "\t");
      };

    }
  ]
);


