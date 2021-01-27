import React from "react";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import ProtoTypes from "prop-types";

const Navbar = () => {
  return (
    <nav className="navbar fixed-bottom navbar-expand-sm navbar-light bg-light">
      <div className="container">
        <a className="navbar-brand" href="#">
          Menü
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ml-auto mt-2 mt-lg-0">
            <li className="nav-item">
              <Link to="/login" className="nav-link">
                Login
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
