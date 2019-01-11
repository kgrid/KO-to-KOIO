#!/usr/bin/env node
const fs = require('fs-extra');
const yaml = require('js-yaml');

// Usage: node object-converter.js <source version folder> <target implementation name>
var args = process.argv.slice(2);
if(args.length !== 2) {
  console.log("Need 2 arguments: source version folder and target implementation name");
  process.exit(1);
}
var objectDir = args[0].substring(0,args[0].lastIndexOf('/'));

// read in version metadata, convert to json object
fs.readFile(args[0] + '/metadata.json', (err, data) => {
  if(err) {
    throw err;
  }
  var versionData = JSON.parse(data);
  readModel(versionData);
});

function readModel(versionData) {
  // read in model metadata, convert to json object
  fs.readFile(args[0] + '/model/metadata.json', (err, data) => {
    if (err) {
      throw err;
    }
    var modelData = JSON.parse(data);
    convertObject(versionData, modelData);
  });
}

function convertObject(versionData, modelData) {
  // convert old version metadata to new object-level metadata
  var tlo = {};
  var implementations = [];
  var context = [];
  context.push("http://kgrid.org/koio/contexts/knowledgeobject.jsonld");
  var arkIdParts = versionData.arkId.split('/');
  tlo['@id'] = arkIdParts[1] + '-' + arkIdParts[2];
  tlo['@type'] = 'koio:KnowledgeObject';
  tlo.identifier = versionData.arkId;
  tlo.title = versionData.title;
  tlo.contributors = versionData.contributors;
  tlo.desription = versionData.description;
  tlo.citations = versionData.citations;
  tlo.keywords = versionData.keywords;
  implementations.push(tlo['@id'] + '/' + args[1]);
  tlo.hasImplementation = implementations;
  tlo['@context'] = context;
  console.log("Writing top-level json-ld to " + objectDir + '/metadata.json')
  fs.writeFile(objectDir + '/metadata.json', JSON.stringify(tlo, null, 2),
      err => {
    if(err) {
      return console.log(err);
    }
  });

  // Create implementation-level metadata
  var impId = args[1];
  var impDir = objectDir + '/' + impId;
  fs.ensureDir(impDir); // Create implementation directory
  var impData = {};
  var impContext = [];
  impContext.push("http://kgrid.org/koio/contexts/implementation.jsonld")
  impData['@id'] = impId;
  impData['@type'] = "koio:Implementation";
  impData.identifier = impId;
  impData.title = versionData.title + " Implementation";
  impData.description = versionData.description;
  impData.keywords = versionData.keywords;
  impData.hasServiceSpecification = impId + '/service-specification.yaml';
  impData.hasDeploymentSpecification = impId + '/deployment-specification.yaml';
  if(modelData.resource.split('/').length === 2) {
    impData.hasPayload = impId + '/' + modelData.resource.split('/')[1];
  } else {
    impData.hasPayload = impId + '/' + modelData.resource;
  }
  impData['@context'] = impContext;
  console.log(
      "Writing implementation-level json-ld to " + impDir + '/metadata.json')
  fs.writeFile(impDir + '/metadata.json', JSON.stringify(impData, null, 2),
      err => {
    if(err) {
      return console.log(err);
    }
  });

  //Move the code to the new version folder
  console.log(
      "Copying file from " + args[0] + '/model/' + modelData.resource + " to " +
      objectDir + '/' + impData.hasPayload);
  fs.copy(args[0] + '/model/' + modelData.resource,
      objectDir + '/' + impData.hasPayload,
      err => {
    if(err) {
      return console.log(err);
    }
  });
//
  // Read in the service spec and edit the version number before copying it back
  console.log(
      "Copying file from " + args[0] + '/' + versionData.service + " to " +
      objectDir + '/' + impData.hasServiceSpecification + " and updating url");
  fs.readFile(args[0] + '/' + versionData.service, (err, data) => {
    if (err) {
      throw err;
    }
    var serviceSpec = yaml.safeLoad(data);
  updateServiceSpec(impData, serviceSpec);
  });

  // Create deployment specificiation yaml
  console.log("Writing deployment spec to " + objectDir + '/' + args[1] + '/' + 'deployment-specification.yaml');
  var deployData = {};
  var endpoints = {}
  var endpoint = {};
  endpoint.adapterType = modelData.adapterType;
  if(modelData.resource.split('/').length === 2) {
    endpoint.artifact = modelData.resource.split('/')[1];
  } else {
    endpoint.artifact = modelData.resource;
  }
  endpoint.entry = modelData.functionName;
  endpoints['/'+ modelData.functionName] = endpoint;
  deployData.endpoints = endpoints;

  fs.writeFile(objectDir + '/' + args[1] + '/' + 'deployment-specification.yaml',
      yaml.safeDump(deployData),
      err => {
    if(err) {
      return console.log(err);
    }
  });
}

function updateServiceSpec(impData, serviceSpec) {
  var urlParts = serviceSpec.servers[0].url.split('/');
  serviceSpec.servers[0].url = urlParts[0] + '/' + urlParts[1] + '/' + urlParts[2] + '/' + args[1];
  fs.writeFile(objectDir + '/' + impData.hasServiceSpecification, yaml.safeDump(serviceSpec),
      err => {
    if(err) {
      return console.log(err);
    }
  });
}

