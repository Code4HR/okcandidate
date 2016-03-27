import React, { Component, PropTypes } from 'react'

import { browserHistory } from 'react-router'

import {
  Input,
  Button,
  Col,
  Grid,
  Row
} from 'react-bootstrap'

import {
  submitStreetAddress,
  fetchGeography,
  selectGeography
} from './../../redux/survey/survey-actions'

class WardFinder extends Component {

  constructor(props) {
    super(props)
    this.state = {
      address: {}
    }
  }

  componentWillMount() {
    this.props.dispatch(fetchGeography())
  }

  onSetAddress(event) {
    this.setState({
      address: { value: event.target.value }
    })
  }

  selectGeography() {
    const selection = parseInt(this.refs.selectGeography.getValue(), 10)
    this.props.dispatch(selectGeography(selection))
  }

  submitAddress() {
    const address = this.state.address.value
    if (address && address.length > 3) {
      this.props.dispatch(submitStreetAddress(address))
    }
    else {
      this.setState({
        address: {
          value: address,
          help: 'This field shouldn\'t be blank'
        }
      })
    }
  }

  nextPage() {
    browserHistory.push('/survey/questions')
  }

  render() {

    return (
      <section>
        <Grid>

          <Row>
            <Col xs={12}>
              <h1>Where are you?</h1>
            </Col>
          </Row>

          <Row>
            <Col xs={12} sm={6}>
              <p>Find politicians near you!</p>
              <Input type="text"
                label="Street Address"
                onChange={this.onSetAddress.bind(this)}
                value={this.state.address.value}
                help={this.state.address.help}
                bsSize="large"
                placeholder="111 Granby St"
                buttonAfter={
                  <Button
                    onClick={this.submitAddress.bind(this)}
                    bsStyle="primary">Submit</Button>
                } />
            </Col>

            <Col xs={12} sm={6}>
              <p>If you already know your super ward, you can pick it here.</p>
              <Input
                ref="selectGeography"
                onChange={this.selectGeography.bind(this)}
                bsSize="large"
                type="select"
                label="Select a Super Ward"
                placeholder="select">
                <option value={0}>...</option>
                {
                  this.props.ward.results.map(ward => {
                    return (
                      <option value={ward.id}>{ward.geographyName}</option>
                    )
                  })
                }
              </Input>
            </Col>

          </Row>

          <Row>
            <Col xs={9}>
              <p>Find your superward to continue.</p>
            </Col>
            <Col xs={3}>
              <Button
                onClick={this.nextPage.bind(this)}
                disabled={!this.props.ward.id}
                bsStyle="danger"
                bsSize="large">Next</Button>
            </Col>
          </Row>

        </Grid>

      </section>
    )
  }

}

WardFinder.propTypes = {
  ward: PropTypes.object,
  dispatch: PropTypes.func
}

export default WardFinder
