import React from "react";
import { Auth, API, graphqlOperaiton, graphqlOperation } from "aws-amplify";
// prettier-ignore
import { Table, Button, Notification, MessageBox, Message, Tabs, Icon, Form, Dialog, Input, Card, Tag } from 'element-react'
import { convertCentsToDollars, formatOrderDate } from "../utils";

const getUser = `query GetUser($id: ID!) {
  getUser(id: $id) {
    id
    username
    email
    registered
    orders(sortDirection: DESC, limit: 999) {
      items {
        id
        createdAt
        product {
          id
          owner
          price
          createdAt
          description
        }
        shippingAddress {
          city
          country
          address_line1
          address_state
          address_zip
        }
      }
      nextToken
    }
  }
}
`;

class ProfilePage extends React.Component {
  state = {
    email: this.props.userAttributes.email,
    emailDialog: false,
    verificationCode: "",
    verificationForm: false,
    orders: [],
    columns: [
      { prop: "name", width: "150" },
      { prop: "value", width: "330" },
      { prop: "tag", width: "150", render: row => {
        if (row.name === "Email") {
          const emailVerified = this.props.userAttributes.email_verified;
          return emailVerified
            ? <Tag type="success">Verified</Tag>
            : <Tag type="danger">Unverified</Tag>
        }
      } },
      { prop: "operations", render: row => {
        switch (row.name) {
          case "Email":
            return <Button
              type="info"
              size="small"
              onClick={() => this.setState({ emailDialog: true })}
            >Edit</Button>;
          case "Delete Profile":
            return <Button
              type="danger"
              size="small"
              onClick={this.handleDeleteProfile}
            >Delete</Button>;
          default:
            return;
        }
      } }
    ]
  };

  componentDidMount() {
    if (this.props.userAttributes) {
      this.getUserOrders(this.props.userAttributes.sub);
    }
  }

  getUserOrders = async userId => {
    const input = { id: userId };
    const result = await API.graphql(graphqlOperation(getUser, input));
    this.setState({ orders: result.data.getUser.orders.items });
  }

  handleUpdateEmail = async () => {
    try {
      const updatedAttributes = {
        email: this.state.email
      };
      const result = await Auth.updateUserAttributes(this.props.user, updatedAttributes);
      if (result === "SUCCESS") {
        this.sendVerificationCode("email");
      }
    } catch (err) {
      console.error(err);
      Notification({
        tilte: "Error",
        message: `${err.message || "Error updating email"}`
      });
    }
  }

  sendVerificationCode = async attr => {
    await Auth.verifyCurrentUserAttribute(attr);
    this.setState({ verificationForm: true });
    Message({
      type: "info",
      customClass: "message",
      message: `Verification code sent to ${this.state.email}`
    });
  }

  handleVerifyEmail = async attr => {
    try {
      console.log("verification code", this.state.verificationCode);
      const result = await Auth.verifyCurrentUserAttributeSubmit(attr, this.state.verificationCode);
      Notification({
        title: "Success",
        message: "Email successfully verified",
        type: `${result.toLocaleLowerCase()}`
      });
      setTimeout(() => window.location.reload(), 3000);
    } catch (err) {
      console.error(err);
      Notification.error({
        title: "Error",
        message: `${err.message || "Error updating email"}`
      });
    }
  }

  handleDeleteProfile = () => {
    MessageBox.confirm(
      "This will permanently delete your account. Contine?",
      "Attention!",
      {
        confirmButtonClass: "Delete",
        cancelButtonClass: "Cancel",
        type: "warning"
      }
    ).then(async () => {
      try {
        await this.props.user.deleteUser();
      } catch (err) {
        console.error(err);
      }
    }).catch(() => {
      Message({
        type: "info",
        message: "Delete canceled"
      })
    })
  }

  render() {
    const { orders, columns, email, emailDialog, verificationForm, verificationCode } = this.state;
    const { user, userAttributes } = this.props;
    return userAttributes && (
      <>
        <Tabs activeName="1" className="profile-tabs">
          <Tabs.Pane
            label={
              <>
                <Icon name="document" className="icon" />
                Summary
              </>
            }
            name="1"
          >
            <h2 className="header">Profile Summary</h2>
            <Table
              columns={columns}
              data={[
                { name: "Your Id", value: userAttributes.sub },
                { name: "Username", value: user.username },
                { name: "Email", value: userAttributes.email },
                { name: "Phone Number", value: userAttributes.phone_number },
                { name: "Delete Profile", value: "Sorry to see you go" },
              ]}
              showHeader={false}
              rowClassName={row => row.name === "Delete Profile" && "delete-profile"}
            />
          </Tabs.Pane>
          <Tabs.Pane
            label={
              <>
                <Icon name="message" className="icon" />
                Orders
              </>
            }
            name="2"
          >
            <h2 className="header">Order History</h2>
            {orders.map(order => (
              <div className="mb-1" key={order.id}>
                <Card>
                  <pre>
                    <p>Order Id: {order.id}</p>
                    <p>Product Description: {order.product.description}</p>
                    <p>Price: ${convertCentsToDollars(order.product.price)}</p>
                    <p>Purchased on {formatOrderDate(order.createdAt)}</p>
                    {order.shippingAddress && (
                      <>
                        Shipping Address
                        <div className="ml-2">
                          <p>{order.shippingAddress.address_line1}</p>
                          <p>
                            {order.shippingAddress.city}, {order.shippingAddress.address_state} {order.shippingAddress.country} {order.shippingAddress.address_zip}
                          </p>
                        </div>
                      </>
                    )}
                  </pre>
                </Card>
              </div>
            ))}
          </Tabs.Pane>
        </Tabs>

        {/* Email Dialog */}
        <Dialog
          size="large"
          customClass="dialog"
          title="Edit Email"
          visible={emailDialog}
          onCancel={() => this.setState({ emailDialog: false })}
        >
          <Dialog.Body>
            <Form labelPosition="top">
              <Form.Item lable="email">
                <Input
                  label="Email"
                  value={email}
                  onChange={email => this.setState({ email })}
                />
              </Form.Item>
              {verificationForm && (
                <Form.Item
                  label="Enter Verification Code"
                  labelWidth="120"
                >
                  <Input
                    onChange={verificationCode => this.setState({ verificationCode })}
                    value={verificationCode}
                  />
                </Form.Item>
              )}
            </Form>
          </Dialog.Body>
          <Dialog.Footer>
            <Button onClick={email => this.setState({ emailDialog: false })}>
              Cancel
            </Button>
            {!verificationForm && <Button type="primary" onClick={this.handleUpdateEmail}>Save</Button>}
            {verificationForm && <Button type="primary" onClick={() => this.handleVerifyEmail("email")}>Submit</Button>}
          </Dialog.Footer>
        </Dialog>
      </>
    );
  }
}

export default ProfilePage;
