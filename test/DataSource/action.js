var D = require("../../src/D.js")
var assert = require("assert")
var DataArray = require("../../src/DataArray.js")
var DataObject = require("../../src/DataObject.js")
var Promise = require("bluebird")
var _= require("lodash")

/**
 * Actions
 */
describe("Actions", function(){
  var currentSettings
  var idToGet = 1
  var userList = [{
    id : idToGet,
    name : "Gilgamesh"
  },{
    id: idToGet+1,
    name : "Enkidu"
  }]

  beforeEach(function(){
    D("user",{
      query : function(  settings ){
        currentSettings = settings
        if( (new RegExp(idToGet+"$")).test( settings.url)  ){
          return new Promise(function( resolve){
            setTimeout(function(){
              resolve(userList[0])
            },100)
          })
        }else{
          return new Promise(function( resolve){
            setTimeout(function(){
              resolve(userList)
            },100)
          })
        }
      }
    })
  })

  it("DataSource actions",function( done ){
    var dataSource = D("user")
    var instance = D("user").get(idToGet)
    var params = {param1:"param1"}
    var action = "someAction"

    instance.onStatus("$$filled",function(filled){
      if( filled){
        dataSource.action(action)(instance,params)
        assert.equal( currentSettings.url, "/user/"+idToGet+"/"+action)
        assert.equal( currentSettings.method, "PUT")
        _.forEach( params, function( v, k){
          assert.equal( currentSettings.data[k], v)
        })
        done()
      }
    })
  })

  it("Action overwrite",function( done){
    var dataSource = D("user")
    var instance = D("user").get(idToGet)
    var params = {param1:"param1"}
    var action = "anotherAction"
    var actionDef ={
      method : "POST"
    }
    var innerInstance, innerParams, innerDataSource
    var actionOverwriteFn = function(instanceOrCollections,params,dataSource){
      innerInstance = instanceOrCollections
      innerParams = params
      innerDataSource = dataSource
      return actionDef
    }

    instance.onStatus("$$filled",function(filled) {
      if (filled) {
        dataSource.action(action, actionOverwriteFn)
        dataSource.action(action)(instance,params)

        assert.equal( innerInstance, instance)
        assert.equal( innerParams, params)
        assert.equal( innerDataSource, dataSource)
        _.forEach( actionDef, function(v, k){
          assert.equal( currentSettings[k], v)
        })
        done()
      }
    })
  })

  it("Action on instance",function(done){
    var dataSource = D("user")
    var instance = dataSource.get(idToGet)
    var params = {param1:"param1"}
    var action = "someAction"

    instance.onStatus("$$filled",function(filled){
      if( filled){
        var actionPromise = instance.action(action)(params)
        assert.equal( currentSettings.url, "/user/"+idToGet+"/"+action)
        assert.equal( currentSettings.method, "PUT")
        _.forEach( params, function( v, k){
          assert.equal( currentSettings.data[k], v)
        })
        //action status
        assert.equal( instance.$$actions[action], "executing" )
        actionPromise.then(function(){
          assert.equal( instance.$$actions[action], "succeed" )
          done()
        })
      }
    })
  })

  it("Action on collection",function(done){
    var dataSource = D("user")
    var collection = dataSource.get()
    var params = {param1:"param1"}
    var action = "someAction"

    collection.onStatus("$$filled",function(filled){
      if( filled){
        var actionPromise = collection.action(action)(params)
        assert.equal( currentSettings.url, "/user/"+action)
        assert.equal( currentSettings.method, "PUT")
        _.forEach( params, function( v, k){
          assert.equal( currentSettings.data[k], v)
        })
        //action status
        assert.equal( collection.$$actions[action], "executing" )
        actionPromise.then(function(){
          assert.equal( collection.$$actions[action], "succeed" )
          done()
        })
      }
    })
  })

  it("Action on slice",function(done){
    var dataSource = D("user")
    var collection = dataSource.get().filter("id",idToGet)
    var params = {param1:"param1"}
    var action = "someAction"
    //
    collection.onStatus("$$filled",function(filled){
      if( filled){
        var actionPromise = collection.action(action)(params)
        assert.equal( currentSettings.url, "/user/"+action)
        assert.equal( currentSettings.method, "PUT")
        _.forEach( params, function( v, k){
          assert.equal( currentSettings.data[k], v)
        })
        //action status
        assert.equal( collection.$$actions[action], "executing" )
        actionPromise.then(function(){
          assert.equal( collection.$$actions[action], "succeed" )
          done()
        })
      }
    })
  })
})


