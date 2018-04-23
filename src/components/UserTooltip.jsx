import React, {Component} from 'react';
import ArrowRightSvg from './../img/arrow-right.svg';
import AcceptSvg from './../img/accept.svg';

class UserTooltip extends Component {
    render() {
        return (
            <div className="user-tooltip">
                <div className="user-tooltip__info">
                    <div className="user-tooltip__info-title">User want to swap</div>
                    <div className="user-tooltip__currency">
                                    <span className="user-tooltip__from">10 <span
                                        className="user-tooltip__coin">eth</span></span>
                        <span className="user-tooltip__arrow"><img src={ArrowRightSvg} alt=""/></span>
                        <span className="user-tooltip__to">1 <span className="user-tooltip__coin">btc</span></span>
                    </div>
                </div>

                <div className="user-tooltip__checked">
                    <img src={AcceptSvg} alt=""/>
                </div>
            </div>
        )
    }
}

export default UserTooltip