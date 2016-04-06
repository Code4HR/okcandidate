module.exports = function (server) {
  const Candidate = server.plugins['hapi-shelf'].model('Candidate')
  const SurveyAnswer = server.plugins['hapi-shelf'].model('SurveyAnswer')

  return [{
    method: 'GET',
    path: '/api/candidate',
    handler: (request, reply) => {
      Candidate
        .fetchAll()
        .then(candidates => {
          reply(candidates)
        })
    }
  },
  {
    method: 'GET',
    path: '/api/candidate/{id}',
    handler: (request, reply) => {
      Candidate
        .where({id: request.params.id})
        .fetch()
        .then(candidate => {
          reply(candidate)
        })
    }
  },
  {
    method: 'GET',
    path: '/api/candidate_match/{survey_response_id}',
    handler: (request, reply) => {
      SurveyAnswer
      .query(function(score_builder) {
        score_builder.sum('intensity as score');
        score_builder.where('survey_response_id', request.params.survey_response_id)
      })
      .fetch()
      .then(function(total) {
        var score_raw = 'round((sum(cast(survey_answer.intensity as numeric(3,2))) / '
        + total.attributes.score + ') * 100) as composite_score'

        SurveyAnswer
        .query(function(match_builder) {
          match_builder.column('survey_response.id as survey_id', 'survey_response.geography_id')
          match_builder.column('candidate_answer.candidate_id', 'candidate.candidate_name')
          match_builder.column('candidate_type.id as type_id', 'candidate_type.type_name')
          match_builder.column(server.plugins['hapi-shelf'].knex.raw(score_raw))
          match_builder.innerJoin('survey_response', 'survey_answer.survey_response_id', 'survey_response.id')
          match_builder.innerJoin('candidate_answer', 'survey_answer.answer_id', 'candidate_answer.answer_id')
          match_builder.innerJoin('candidate_geography', function() {
            this.on('candidate_answer.candidate_id', '=', 'candidate_geography.candidate_id')
            .andOn('candidate_geography.geography_id', '=', 'survey_response.geography_id')
          })
          match_builder.innerJoin('candidate', 'candidate_answer.candidate_id', 'candidate.id')
          match_builder.innerJoin('candidate_type', 'candidate.candidate_type_id', 'candidate_type.id')
          match_builder.groupBy('survey_response.id', 'survey_response.geography_id'
          , 'candidate_answer.candidate_id', 'candidate.candidate_name'
          , 'candidate_type.id', 'candidate_type.type_name')
        })
        .fetchAll()
        .then(matches => {
          reply(formatCandidateMatch(matches.models))
        })
      })
    }
  }]
}

function formatCandidateMatch(matchArray) {
  var output = {}
  output.id = matchArray[0].attributes.surveyId
  output.geographyId = matchArray[0].attributes.geographyId

  output.survey = []

  matchArray.map(function(match) {
    var typeIndex = output.survey.findIndex(type =>
      type.candidateTypeName === match.attributes.typeName)

    if(typeIndex === -1)
    {
      output.survey.push({
        candidateTypeId: match.attributes.typeId,
        candidateTypeName: match.attributes.typeName,
        candidates: [{
          candidateId: match.attributes.candidateId,
          candidateName: match.attributes.candidateName,
          compositeMatchScore: match.attributes.compositeScore
        }]
      })
    } else {
      var candIndex = output.survey[typeIndex].candidates.findIndex(cand =>
        cand.candidateId === match.attributes.candidateId)

      if (candIndex === -1)
      {
        output.survey[typeIndex].candidates.push({
          candidateId: match.attributes.candidateId,
          candidateName: match.attributes.candidateName,
          compositeMatchScore: match.attributes.compositeScore
        })
      }
    }
  })

  return(output)
}